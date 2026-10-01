import logging
import traceback


class IncidentHandler(logging.Handler):
    """Transforme toute erreur loggée côté serveur (exception non gérée → 500, échec d'un
    traitement, etc.) en incident technique + email d'alerte. Branché dans LOGGING."""

    def emit(self, record):
        try:
            from .alertes import signaler_incident

            request = getattr(record, 'request', None)
            # django.request passe parfois un objet non-HttpRequest (socket) : on l'ignore.
            if request is not None and not hasattr(request, 'META'):
                request = None
            if record.exc_info:
                details = ''.join(traceback.format_exception(*record.exc_info))
                exc = record.exc_info[1]
                titre = f"{type(exc).__name__}: {exc}" if exc else record.getMessage()
            else:
                details = record.getMessage()
                titre = record.getMessage()
            details = f"Logger : {record.name}\nMessage : {record.getMessage()}\n\n{details}"
            signaler_incident(
                titre=titre,
                details=details,
                source='backend',
                niveau='critique' if record.levelno >= logging.CRITICAL else 'erreur',
                request=request,
                statut_http=getattr(record, 'status_code', None),
            )
        except Exception:
            self.handleError(record)
