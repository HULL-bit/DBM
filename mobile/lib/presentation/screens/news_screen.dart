import 'dart:io';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:http_parser/http_parser.dart';
import '../../core/constants/colors.dart';
import '../../core/constants/api_endpoints.dart';
import '../../data/services/api_service.dart';
import '../../data/providers/auth_provider.dart';
import '../widgets/app_drawer.dart';
import '../widgets/safe_avatar.dart';

/// Fil d'actualités façon Instagram (images/vidéos, likes, commentaires) —
/// même modèle NewsPost que sur le web (backend/apps/informations).
class NewsScreen extends StatefulWidget {
  const NewsScreen({super.key});

  @override
  State<NewsScreen> createState() => _NewsScreenState();
}

class _NewsScreenState extends State<NewsScreen> {
  final ApiService _api = ApiService();
  bool _loading = true;
  List<dynamic> _posts = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await _api.get(ApiEndpoints.news);
      final list = res['results'] ?? res['data'] ?? [];
      if (mounted) setState(() { _posts = list is List ? list : []; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _toggleLike(int index) async {
    final post = _posts[index];
    final wasLiked = post['is_liked'] == true;
    setState(() {
      post['is_liked'] = !wasLiked;
      post['nb_likes'] = (post['nb_likes'] ?? 0) + (wasLiked ? -1 : 1);
    });
    try {
      await _api.post('${ApiEndpoints.news}${post['id']}/${wasLiked ? 'unlike' : 'like'}/', {});
    } catch (_) {
      if (mounted) {
        setState(() {
          post['is_liked'] = wasLiked;
          post['nb_likes'] = (post['nb_likes'] ?? 0) + (wasLiked ? 1 : -1);
        });
      }
    }
  }

  void _openComments(int index) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => _CommentsSheet(
        postId: _posts[index]['id'],
        api: _api,
        onCommentAdded: () => setState(() => _posts[index]['nb_comments'] = (_posts[index]['nb_comments'] ?? 0) + 1),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.read<AuthProvider>();
    final isManager = auth.user?.isAdmin == true || auth.user?.isJewrinCommunication == true;

    return Scaffold(
      appBar: AppBar(title: const Text('Actualités')),
      drawer: const AppDrawer(),
      floatingActionButton: isManager
          ? FloatingActionButton(
              onPressed: () => _showCreatePost(context),
              backgroundColor: AppColors.primaryGreen,
              child: const Icon(Icons.add, color: AppColors.white),
            )
          : null,
      body: RefreshIndicator(
        onRefresh: _load,
        color: AppColors.primaryGreen,
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: AppColors.primaryGreen))
            : _posts.isEmpty
                ? ListView(
                    children: const [
                      SizedBox(height: 100),
                      Center(child: Text('Aucune actualité disponible', style: TextStyle(color: AppColors.textGrey))),
                    ],
                  )
                : ListView.builder(
                    padding: const EdgeInsets.only(bottom: 16),
                    itemCount: _posts.length,
                    itemBuilder: (context, index) => _NewsCard(
                      post: _posts[index],
                      onLike: () => _toggleLike(index),
                      onComment: () => _openComments(index),
                    ),
                  ),
      ),
    );
  }

  void _showCreatePost(BuildContext context) {
    final titreCtrl = TextEditingController();
    final contenuCtrl = TextEditingController();
    final List<XFile> mediaFiles = [];
    bool posting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Padding(
          padding: EdgeInsets.only(
            left: 20, right: 20, top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('Nouvelle actualité', style: Theme.of(ctx).textTheme.titleLarge?.copyWith(color: AppColors.primaryGreen, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                TextField(controller: titreCtrl, decoration: const InputDecoration(labelText: 'Titre (optionnel)')),
                const SizedBox(height: 12),
                TextField(controller: contenuCtrl, decoration: const InputDecoration(labelText: 'Contenu'), maxLines: 4),
                const SizedBox(height: 12),
                if (mediaFiles.isNotEmpty)
                  SizedBox(
                    height: 80,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: mediaFiles.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 8),
                      itemBuilder: (_, i) => Stack(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Image.file(File(mediaFiles[i].path), width: 80, height: 80, fit: BoxFit.cover),
                          ),
                          Positioned(
                            top: 2, right: 2,
                            child: GestureDetector(
                              onTap: () => setSheetState(() => mediaFiles.removeAt(i)),
                              child: const CircleAvatar(radius: 10, backgroundColor: Colors.black54, child: Icon(Icons.close, size: 14, color: Colors.white)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                const SizedBox(height: 8),
                TextButton.icon(
                  onPressed: () async {
                    final picked = await ImagePicker().pickMultiImage();
                    if (picked.isNotEmpty) setSheetState(() => mediaFiles.addAll(picked));
                  },
                  icon: const Icon(Icons.photo_library_outlined, color: AppColors.primaryGreen),
                  label: const Text('Ajouter des photos', style: TextStyle(color: AppColors.primaryGreen)),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  height: 48,
                  child: ElevatedButton(
                    onPressed: posting
                        ? null
                        : () async {
                            if (contenuCtrl.text.trim().isEmpty && mediaFiles.isEmpty) return;
                            setSheetState(() => posting = true);
                            try {
                              final files = <http.MultipartFile>[];
                              for (final f in mediaFiles) {
                                final bytes = await f.readAsBytes();
                                final mimeType = f.mimeType ?? 'image/jpeg';
                                files.add(http.MultipartFile.fromBytes(
                                  'images',
                                  bytes,
                                  filename: f.name,
                                  contentType: MediaType.parse(mimeType),
                                ));
                              }
                              await _api.postMultipart(
                                ApiEndpoints.news,
                                fields: {
                                  'titre': titreCtrl.text.trim(),
                                  'contenu': contenuCtrl.text.trim(),
                                },
                                files: files,
                              );
                              if (ctx.mounted) Navigator.pop(ctx);
                              _load();
                            } catch (e) {
                              setSheetState(() => posting = false);
                              if (ctx.mounted) {
                                ScaffoldMessenger.of(ctx).showSnackBar(
                                  SnackBar(content: Text('Erreur : $e'), backgroundColor: AppColors.error),
                                );
                              }
                            }
                          },
                    style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryGreen),
                    child: posting
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.white))
                        : const Text('Publier', style: TextStyle(color: AppColors.white)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _NewsCard extends StatelessWidget {
  final dynamic post;
  final VoidCallback onLike;
  final VoidCallback onComment;

  const _NewsCard({required this.post, required this.onLike, required this.onComment});

  @override
  Widget build(BuildContext context) {
    final images = (post['images'] as List?) ?? [];
    final date = DateTime.tryParse(post['date_creation'] ?? '');
    final liked = post['is_liked'] == true;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                SafeAvatar(photoUrl: null, fallbackText: (post['auteur_nom'] ?? '?').toString(), radius: 18),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(post['auteur_nom'] ?? 'Membre', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      if (date != null)
                        Text(DateFormat('d MMM yyyy à HH:mm', 'fr_FR').format(date), style: const TextStyle(fontSize: 11, color: AppColors.textGrey)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          if (images.isNotEmpty)
            SizedBox(
              height: 280,
              child: PageView.builder(
                itemCount: images.length,
                itemBuilder: (_, i) {
                  final media = images[i];
                  final url = (media['image'] ?? '').toString();
                  final fullUrl = url.startsWith('http') ? url : '${ApiEndpoints.mediaBaseUrl}$url';
                  final isVideo = media['type_media'] == 'video';
                  return isVideo
                      ? Container(
                          color: Colors.black87,
                          child: const Center(child: Icon(Icons.play_circle_outline, color: Colors.white, size: 56)),
                        )
                      : Image.network(
                          fullUrl,
                          fit: BoxFit.cover,
                          width: double.infinity,
                          errorBuilder: (_, __, ___) => Container(color: AppColors.primaryGreen.withOpacity(0.08), child: const Icon(Icons.image_not_supported)),
                        );
                },
              ),
            ),
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 4),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if ((post['titre'] ?? '').toString().isNotEmpty)
                  Text(post['titre'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                if ((post['contenu'] ?? '').toString().isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(post['contenu'], style: const TextStyle(fontSize: 14)),
                ],
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
            child: Row(
              children: [
                IconButton(
                  icon: Icon(liked ? Icons.favorite : Icons.favorite_border, color: liked ? AppColors.error : AppColors.textGrey),
                  onPressed: onLike,
                ),
                Text('${post['nb_likes'] ?? 0}', style: const TextStyle(color: AppColors.textGrey)),
                const SizedBox(width: 12),
                IconButton(
                  icon: const Icon(Icons.chat_bubble_outline, color: AppColors.textGrey),
                  onPressed: onComment,
                ),
                Text('${post['nb_comments'] ?? 0}', style: const TextStyle(color: AppColors.textGrey)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CommentsSheet extends StatefulWidget {
  final int postId;
  final ApiService api;
  final VoidCallback onCommentAdded;

  const _CommentsSheet({required this.postId, required this.api, required this.onCommentAdded});

  @override
  State<_CommentsSheet> createState() => _CommentsSheetState();
}

class _CommentsSheetState extends State<_CommentsSheet> {
  final TextEditingController _ctrl = TextEditingController();
  bool _loading = true;
  bool _sending = false;
  List<dynamic> _comments = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await widget.api.get('${ApiEndpoints.news}${widget.postId}/comments/');
      final list = res['results'] ?? res['data'] ?? (res is List ? res : []);
      if (mounted) setState(() { _comments = list is List ? list : []; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _send() async {
    final texte = _ctrl.text.trim();
    if (texte.isEmpty || _sending) return;
    setState(() => _sending = true);
    _ctrl.clear();
    try {
      await widget.api.post('${ApiEndpoints.news}${widget.postId}/comment/', {'texte': texte});
      widget.onCommentAdded();
      await _load();
    } catch (_) {
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SizedBox(
        height: MediaQuery.of(context).size.height * 0.65,
        child: Column(
          children: [
            const SizedBox(height: 12),
            Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2))),
            const Padding(padding: EdgeInsets.all(12), child: Text('Commentaires', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16))),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator(color: AppColors.primaryGreen))
                  : _comments.isEmpty
                      ? const Center(child: Text('Aucun commentaire. Soyez le premier !', style: TextStyle(color: AppColors.textGrey)))
                      : ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: _comments.length,
                          itemBuilder: (_, i) {
                            final c = _comments[i];
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  SafeAvatar(photoUrl: null, fallbackText: (c['membre_nom'] ?? '?').toString(), radius: 14),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(c['membre_nom'] ?? 'Membre', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                                        Text(c['texte'] ?? '', style: const TextStyle(fontSize: 13)),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _ctrl,
                      decoration: InputDecoration(
                        hintText: 'Ajouter un commentaire...',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide.none),
                        filled: true,
                        fillColor: Colors.grey.shade100,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      ),
                      onSubmitted: (_) => _send(),
                    ),
                  ),
                  IconButton(
                    icon: _sending
                        ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.send, color: AppColors.primaryGreen),
                    onPressed: _send,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
