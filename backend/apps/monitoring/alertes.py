"""Enregistrement des incidents techniques et alertes par email.

Point d'entrée unique : `signaler_incident()`, appelé par le handler de logging (erreurs
serveur), par l'endpoint de remontée des erreurs web/mobile et par le health check.

Garanties :
- ne lève JAMAIS d'exception (la surveillance ne doit pas casser l'appli) ;
- regroupe les occurrences d'une même erreur (signature) ;
- anti-spam : au plus un email par incident et par `ALERT_EMAIL_INTERVALLE_MINUTES`,
  et au plus `ALERT_EMAIL_MAX_PAR_HEURE` emails toutes erreurs confondues ;
- l'email part dans un thread pour ne pas ralentir la requête en cours ;
- si la base de données est indisponible, l'email est quand même envoyé.
"""
import hashlib
import logging
import re
import threading
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

logger = logging.getLogger('dbm.monitoring')

# Empêche la récursion : une erreur pendant le signalement (ex: base indisponible) est
# loggée, ce qui redéclencherait le handler, etc.
_local = threading.local()

NIVEAUX_AVEC_EMAIL = {'critique', 'erreur'}


def _normaliser_chemin(chemin):
    """/api/finance/cotisations/123/ → /api/finance/cotisations/N/ : la même erreur sur
    deux objets différents est un seul incident."""
    return re.sub(r'/\d+(?=/|$)', '/N', chemin or '')


def _signature(source, titre, chemin):
    titre_norm = re.sub(r'\d+', 'N', titre or '')[:200]
    brut = f"{source}|{titre_norm}|{_normaliser_chemin(chemin)}"
    return hashlib.sha256(brut.encode('utf-8', 'ignore')).hexdigest()


def _destinataires():
    return [e for e in getattr(settings, 'ALERT_EMAILS', []) if e]


def _envoyer_email_async(sujet, corps):
    destinataires = _destinataires()
    if not destinataires:
        return

    def _envoyer():
        try:
            send_mail(sujet, corps, settings.DEFAULT_FROM_EMAIL, destinataires, fail_silently=False)
        except Exception:
            # Pas de logger.exception ici : ne doit pas redéclencher une alerte.
            logger.warning("Impossible d'envoyer l'email d'alerte (configuration SMTP ?)", exc_info=True)

    if getattr(settings, 'ALERT_EMAIL_ASYNC', True):
        threading.Thread(target=_envoyer, daemon=True).start()
    else:  # tests : envoi immédiat pour pouvoir vérifier la boîte mail simulée
        _envoyer()


def _corps_email(source, niveau, titre, details, chemin, methode, statut_http, utilisateur, request_id,
                 occurrences=1, incident_id=None):
    lignes = [
        f"Niveau : {niveau.upper()}",
        f"Source : {source}",
        f"Date : {timezone.localtime():%d/%m/%Y %H:%M:%S}",
    ]
    if methode or chemin:
        lignes.append(f"Requête : {methode} {chemin}".strip())
    if statut_http:
        lignes.append(f"Statut HTTP : {statut_http}")
    if utilisateur:
        lignes.append(f"Utilisateur : {utilisateur}")
    if request_id:
        lignes.append(f"ID de requête : {request_id} (à chercher dans les logs Render)")
    if occurrences > 1:
        lignes.append(f"Occurrences : {occurrences}")
    if incident_id:
        lignes.append(f"Incident n° {incident_id} — visible dans Journal de sécurité > Incidents techniques")
    lignes += ['', titre, '', (details or '')[:8000]]
    return '\n'.join(lignes)


def signaler_incident(titre, details='', source='backend', niveau='erreur', request=None,
                      chemin='', methode='', statut_http=None, utilisateur=None, user_agent=''):
    """Enregistre (ou incrémente) un incident et prévient par email si nécessaire."""
    if getattr(_local, 'en_cours', False):
        return None
    _local.en_cours = True
    try:
        return _signaler(titre, details, source, niveau, request, chemin, methode, statut_http, utilisateur, user_agent)
    except Exception:
        logger.warning("Échec du signalement d'incident", exc_info=True)
        return None
    finally:
        _local.en_cours = False


def _signaler(titre, details, source, niveau, request, chemin, methode, statut_http, utilisateur, user_agent):
    titre = (titre or 'Erreur inconnue').strip().splitlines()[0][:255]
    request_id = ''
    if request is not None:
        chemin = chemin or request.path
        methode = methode or request.method
        request_id = getattr(request, 'request_id', '')
        user_agent = user_agent or request.META.get('HTTP_USER_AGENT', '')
        if utilisateur is None:
            u = getattr(request, 'user', None)
            if u is not None and getattr(u, 'is_authenticated', False):
                utilisateur = u
    chemin = (chemin or '')[:255]
    signature = _signature(source, titre, chemin)
    maintenant = timezone.now()

    incident = None
    envoyer = niveau in NIVEAUX_AVEC_EMAIL
    try:
        from .models import IncidentSysteme

        incident = IncidentSysteme.objects.filter(signature=signature, resolu=False).first()
        if incident:
            incident.occurrences += 1
            incident.details = details or incident.details
            incident.statut_http = statut_http or incident.statut_http
            incident.request_id = request_id or incident.request_id
            incident.utilisateur = utilisateur or incident.utilisateur
            incident.save()
        else:
            incident = IncidentSysteme.objects.create(
                source=source, niveau=niveau, titre=titre, details=details or '', chemin=chemin,
                methode=(methode or '')[:10], statut_http=statut_http, utilisateur=utilisateur,
                request_id=request_id, user_agent=(user_agent or '')[:300], signature=signature,
            )

        if envoyer:
            intervalle = timedelta(minutes=getattr(settings, 'ALERT_EMAIL_INTERVALLE_MINUTES', 60))
            if incident.dernier_email and maintenant - incident.dernier_email < intervalle:
                envoyer = False
            else:
                emails_derniere_heure = IncidentSysteme.objects.filter(
                    dernier_email__gte=maintenant - timedelta(hours=1)
                ).count()
                if emails_derniere_heure >= getattr(settings, 'ALERT_EMAIL_MAX_PAR_HEURE', 15):
                    envoyer = False
            if envoyer:
                IncidentSysteme.objects.filter(pk=incident.pk).update(dernier_email=maintenant)
    except Exception:
        # Base indisponible : on ne peut ni enregistrer ni dédoublonner, mais on prévient
        # quand même — c'est précisément le genre de panne à signaler.
        logger.warning("Incident non enregistré en base", exc_info=True)
        details = f"(Incident NON enregistré en base — la base de données est peut-être indisponible)\n\n{details}"

    if envoyer:
        icone = '🔴' if niveau == 'critique' else '⚠️'
        sujet = f"{icone} [DBM] {niveau.capitalize()} {source} : {titre}"[:200]
        _envoyer_email_async(sujet, _corps_email(
            source, niveau, titre, details, chemin, methode, statut_http,
            utilisateur, request_id, incident.occurrences if incident else 1,
            incident.pk if incident else None,
        ))
    return incident
