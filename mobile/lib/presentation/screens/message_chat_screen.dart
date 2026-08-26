import 'dart:io';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import '../../core/constants/api_endpoints.dart';
import '../../core/constants/colors.dart';
import '../../data/providers/auth_provider.dart';
import '../../data/services/api_service.dart';
import '../widgets/safe_avatar.dart';
import '../widgets/voice_recorder_button.dart';
import '../widgets/voice_message_player.dart';

const _extensionsAudio = ['.m4a', '.mp3', '.wav', '.ogg', '.aac'];
bool _estFichierAudio(String? url) {
  if (url == null) return false;
  final lower = url.toLowerCase();
  return _extensionsAudio.any((ext) => lower.contains(ext));
}

class MessageChatScreen extends StatefulWidget {
  final Map<String, dynamic> contact;

  const MessageChatScreen({super.key, required this.contact});

  @override
  State<MessageChatScreen> createState() => _MessageChatScreenState();
}

class _MessageChatScreenState extends State<MessageChatScreen> {
  final ApiService _api = ApiService();
  final TextEditingController _msgController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  bool _loading = true;
  bool _sending = false;
  List<dynamic> _messages = [];

  @override
  void initState() {
    super.initState();
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
      final res = await _api.get('${ApiEndpoints.messages}?contact_id=${widget.contact['contact_id']}');
      final list = res['results'] ?? res['data'] ?? [];
      if (mounted) {
        setState(() {
          _messages = list is List ? list : [];
          _loading = false;
        });
        WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());
        await _api.post('${ApiEndpoints.messages}marquer_conversation_lue/', {
          'contact_id': widget.contact['contact_id'],
        });
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
    final userFirstName = context.read<AuthProvider>().user?.firstName ?? 'Moi';
    try {
      await _api.post(ApiEndpoints.messages, {
        'destinataires': [widget.contact['contact_id']],
        'sujet': 'Message de $userFirstName',
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
    final userFirstName = context.read<AuthProvider>().user?.firstName ?? 'Moi';
    try {
      final bytes = await file.readAsBytes();
      await _api.postMultipart(
        ApiEndpoints.messages,
        fields: {
          'destinataires': widget.contact['contact_id'].toString(),
          'sujet': 'Message de $userFirstName',
          'contenu': 'Message vocal',
        },
        files: [http.MultipartFile.fromBytes('fichier_joint', bytes, filename: 'vocal.m4a')],
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

  @override
  Widget build(BuildContext context) {
    final userId = context.read<AuthProvider>().user?.id;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            SafeAvatar(
              photoUrl: widget.contact['contact_photo'] as String?,
              fallbackText: (widget.contact['contact_name'] ?? '?').toString(),
              radius: 16,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                widget.contact['contact_name'] ?? 'Membre',
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
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
                    VoiceRecorderButton(onRecorded: _sendVoiceMessage),
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
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
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
        child: _estFichierAudio(msg['fichier_joint'] as String?)
            ? VoiceMessagePlayer(
                url: (msg['fichier_joint'] as String).startsWith('http')
                    ? msg['fichier_joint']
                    : '${ApiEndpoints.mediaBaseUrl}${msg['fichier_joint']}',
                light: isMe,
              )
            : Text(
                msg['contenu'] ?? '',
                style: TextStyle(color: isMe ? AppColors.white : AppColors.textDark, fontSize: 14),
              ),
      ),
    );
  }
}
