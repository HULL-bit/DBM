import 'dart:io';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/constants/colors.dart';
import '../../../data/providers/auth_provider.dart';
import '../../../data/services/api_service.dart';
import '../../widgets/safe_avatar.dart';
import '../../widgets/voice_recorder_button.dart';
import '../../widgets/voice_message_player.dart';

class CanalChatScreen extends StatefulWidget {
  final Map<String, dynamic> canal;

  const CanalChatScreen({super.key, required this.canal});

  @override
  State<CanalChatScreen> createState() => _CanalChatScreenState();
}

class _CanalChatScreenState extends State<CanalChatScreen> {
  final ApiService _api = ApiService();
  final TextEditingController _msgController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  bool _loading = true;
  bool _sending = false;
  bool _reunionEnCours = false;
  List<dynamic> _messages = [];
  String? _lienReunion;

  @override
  void initState() {
    super.initState();
    _lienReunion = widget.canal['lien_reunion'] as String?;
    if (_lienReunion != null && _lienReunion!.isEmpty) _lienReunion = null;
    _load();
  }

  @override
  void dispose() {
    _msgController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final res = await _api.get('${ApiEndpoints.messagesCanaux}?canal=${widget.canal['id']}');
      final list = res['results'] ?? res['data'] ?? [];
      if (mounted) {
        setState(() {
          _messages = list is List ? list : [];
          _loading = false;
        });
        WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _scrollToBottom() {
    if (!_scrollController.hasClients) return;
    _scrollController.jumpTo(_scrollController.position.maxScrollExtent);
  }

  Future<void> _sendMessage() async {
    final content = _msgController.text.trim();
    if (content.isEmpty || _sending) return;
    setState(() => _sending = true);
    _msgController.clear();
    try {
      await _api.post(ApiEndpoints.messagesCanaux, {
        'canal': widget.canal['id'],
        'type_message': 'texte',
        'contenu': content,
      });
      await _load();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Erreur lors de l'envoi du message."), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _sendVoiceMessage(File file, int dureeSecondes) async {
    setState(() => _sending = true);
    try {
      final bytes = await file.readAsBytes();
      await _api.postMultipart(
        ApiEndpoints.messagesCanaux,
        fields: {
          'canal': widget.canal['id'].toString(),
          'type_message': 'audio',
          'duree': dureeSecondes.toString(),
        },
        files: [http.MultipartFile.fromBytes('fichier', bytes, filename: 'vocal.m4a')],
      );
      await _load();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Erreur lors de l'envoi du message vocal."), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _sending = false);
      if (await file.exists()) await file.delete();
    }
  }

  Future<void> _demarrerReunion() async {
    setState(() => _reunionEnCours = true);
    try {
      final res = await _api.post('${ApiEndpoints.canaux}${widget.canal['id']}/demarrer-reunion/', {});
      final lien = res['lien_reunion'] as String?;
      if (mounted) setState(() => _lienReunion = lien);
      if (lien != null) await _rejoindre(lien);
      await _load();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Impossible de démarrer la réunion."), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _reunionEnCours = false);
    }
  }

  Future<void> _terminerReunion() async {
    setState(() => _reunionEnCours = true);
    try {
      await _api.post('${ApiEndpoints.canaux}${widget.canal['id']}/terminer-reunion/', {});
      if (mounted) setState(() => _lienReunion = null);
      await _load();
    } catch (_) {
    } finally {
      if (mounted) setState(() => _reunionEnCours = false);
    }
  }

  Future<void> _rejoindre(String lien) async {
    final uri = Uri.parse(lien);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Impossible d'ouvrir le lien de réunion."), backgroundColor: AppColors.error),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final userId = context.read<AuthProvider>().user?.id;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            SafeAvatar(
              photoUrl: widget.canal['image'] as String?,
              fallbackText: (widget.canal['nom'] ?? '?').toString(),
              radius: 16,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                widget.canal['nom'] ?? 'Canal',
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
        actions: [
          if (_reunionEnCours)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16),
              child: Center(
                child: SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.white),
                ),
              ),
            )
          else if (_lienReunion != null) ...[
            IconButton(
              icon: const Icon(Icons.video_call),
              tooltip: 'Rejoindre la réunion',
              onPressed: () => _rejoindre(_lienReunion!),
            ),
            IconButton(
              icon: const Icon(Icons.call_end),
              tooltip: 'Terminer la réunion',
              onPressed: _terminerReunion,
            ),
          ] else
            IconButton(
              icon: const Icon(Icons.videocam_outlined),
              tooltip: 'Démarrer une réunion',
              onPressed: _demarrerReunion,
            ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: AppColors.primaryGreen))
                : _messages.isEmpty
                    ? const Center(
                        child: Text('Aucun message. Lancez la discussion !', style: TextStyle(color: AppColors.textGrey)),
                      )
                    : ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.all(16),
                        itemCount: _messages.length,
                        itemBuilder: (context, index) {
                          final msg = _messages[index];
                          final isMe = msg['expediteur'] == userId;
                          return _MessageBubble(msg: msg, isMe: isMe);
                        },
                      ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.white,
              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, -2))],
            ),
            child: SafeArea(
              top: false,
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _msgController,
                      minLines: 1,
                      maxLines: 4,
                      textInputAction: TextInputAction.send,
                      onChanged: (_) => setState(() {}),
                      onSubmitted: (_) => _sendMessage(),
                      decoration: InputDecoration(
                        hintText: 'Votre message...',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide.none),
                        filled: true,
                        fillColor: Colors.grey.shade100,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      ),
                    ),
                  ),
                  if (_msgController.text.trim().isEmpty)
                    VoiceRecorderButton(onRecorded: _sendVoiceMessage)
                  else
                    const SizedBox.shrink(),
                  const SizedBox(width: 4),
                  CircleAvatar(
                    backgroundColor: AppColors.primaryGold,
                    radius: 22,
                    child: _sending
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.white),
                          )
                        : IconButton(
                            icon: const Icon(Icons.send, color: AppColors.white, size: 20),
                            onPressed: _sendMessage,
                          ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  final Map<String, dynamic> msg;
  final bool isMe;

  const _MessageBubble({required this.msg, required this.isMe});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isMe) ...[
            SafeAvatar(
              photoUrl: msg['expediteur_photo'] as String?,
              fallbackText: (msg['expediteur_nom'] ?? '?').toString(),
              radius: 14,
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Container(
              padding: const EdgeInsets.all(12),
              constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.7),
              decoration: BoxDecoration(
                color: isMe ? AppColors.primaryGreen : AppColors.white,
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(16),
                  topRight: const Radius.circular(16),
                  bottomLeft: Radius.circular(isMe ? 16 : 4),
                  bottomRight: Radius.circular(isMe ? 4 : 16),
                ),
                border: isMe ? null : Border.all(color: AppColors.primaryGold.withValues(alpha: 0.3)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (!isMe)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Text(
                        msg['expediteur_nom'] ?? 'Membre',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: AppColors.primaryGold),
                      ),
                    ),
                  if (msg['type_message'] == 'audio' && msg['fichier'] != null)
                    VoiceMessagePlayer(
                      url: (msg['fichier'] as String).startsWith('http')
                          ? msg['fichier']
                          : '${ApiEndpoints.mediaBaseUrl}${msg['fichier']}',
                      dureeSecondes: msg['duree'] as int?,
                      light: isMe,
                    )
                  else
                    Text(
                      msg['contenu'] ?? '',
                      style: TextStyle(color: isMe ? AppColors.white : AppColors.textDark, fontSize: 14),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
