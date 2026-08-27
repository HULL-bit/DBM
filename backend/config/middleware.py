class MediaCorsMiddleware:
    """Autorise l'accès cross-origin en lecture aux fichiers médias (photos, PDF, etc.).

    Ces fichiers sont déjà publics : affichés sans authentification dans des balises <img>
    partout dans l'app. Un <img> s'affiche sans CORS, mais toute lecture programmatique du
    pixel (export d'une carte de membre en PDF via canvas, par ex.) est bloquée par le
    navigateur si la réponse ne porte pas Access-Control-Allow-Origin — même si le fichier
    s'affiche normalement à l'écran. La politique CORS générale de l'API (CORS_ALLOWED_ORIGINS)
    reste inchangée pour tout le reste ; seuls les fichiers sous MEDIA_URL sont concernés ici.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if request.path.startswith('/media/'):
            response['Access-Control-Allow-Origin'] = '*'
        return response
