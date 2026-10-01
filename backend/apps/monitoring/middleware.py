import logging
import time
import uuid

logger = logging.getLogger('dbm.requetes')

CHEMINS_IGNORES = ('/api/health/', '/static/', '/media/', '/favicon.ico')


class TracabiliteRequeteMiddleware:
    """Traçabilité technique de chaque appel API :
    - attribue un identifiant de requête (en-tête X-Request-ID, renvoyé au client et repris
      dans les emails d'alerte) pour retrouver une erreur précise dans les logs Render ;
    - écrit une ligne de log par requête : méthode, chemin, statut, durée, utilisateur, IP ;
    - signale les requêtes anormalement lentes."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        rid = (request.META.get('HTTP_X_REQUEST_ID') or '')[:40] or uuid.uuid4().hex[:12]
        request.request_id = rid
        debut = time.monotonic()
        response = self.get_response(request)
        duree_ms = int((time.monotonic() - debut) * 1000)
        response['X-Request-ID'] = rid

        if request.path.startswith(CHEMINS_IGNORES):
            return response

        user = getattr(request, 'user', None)
        qui = user.username if user is not None and getattr(user, 'is_authenticated', False) else 'anonyme'
        ip = (request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip()
              or request.META.get('REMOTE_ADDR', ''))
        message = '%s %s %s %dms user=%s ip=%s rid=%s'
        args = (request.method, request.get_full_path()[:300], response.status_code, duree_ms, qui, ip, rid)

        if response.status_code >= 500:
            logger.warning(message, *args)  # l'erreur elle-même est signalée par django.request
        elif duree_ms >= 10000:
            logger.warning('LENTE ' + message, *args)
        else:
            logger.info(message, *args)
        return response
