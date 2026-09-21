from django.core.management.base import BaseCommand

from apps.accounts.models import JournalAudit
from apps.finance.models import CotisationMensuelle


class Command(BaseCommand):
    help = (
        "Supprime TOUTES les cotisations mensuelles (remise à zéro complète), "
        "pour repartir sur une base propre. Irréversible : demande une confirmation "
        "sauf si --yes est passé."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--yes', action='store_true',
            help="Ne pas demander de confirmation (utile en exécution non interactive)."
        )

    def handle(self, *args, **options):
        total = CotisationMensuelle.objects.count()
        if total == 0:
            self.stdout.write(self.style.WARNING("Aucune cotisation à supprimer, la table est déjà vide."))
            return

        self.stdout.write(self.style.WARNING(f"{total} cotisation(s) vont être supprimées définitivement."))

        if not options['yes']:
            reponse = input('Confirmer la suppression ? (taper "oui" pour continuer) : ').strip().lower()
            if reponse != 'oui':
                self.stdout.write(self.style.NOTICE("Annulé, aucune suppression effectuée."))
                return

        CotisationMensuelle.objects.all().delete()

        JournalAudit.objects.create(
            action='suppression', rubrique='finance',
            description=f"Remise à zéro : {total} cotisation(s) supprimée(s) via purge_cotisations",
        )

        self.stdout.write(self.style.SUCCESS(f"{total} cotisation(s) supprimée(s). On repart de zéro."))
