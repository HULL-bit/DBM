import 'package:flutter/material.dart';
import '../../core/constants/api_endpoints.dart';
import '../../core/constants/colors.dart';
import '../../data/services/api_service.dart';
import 'package:provider/provider.dart';
import '../../data/providers/auth_provider.dart';
import '../widgets/app_drawer.dart';

class MessagerieScreen extends StatefulWidget {
  const MessagerieScreen({super.key});

  @override
  State<MessagerieScreen> createState() => _MessagerieScreenState();
}

class _MessagerieScreenState extends State<MessagerieScreen> {
  final ApiService _api = ApiService();
  bool _loading = true;
  List<dynamic> _messages = [];
  final TextEditingController _msgController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadMessages();
  }

  Future<void> _loadMessages() async {
    try {
      final res = await _api.get(ApiEndpoints.messages);
      final list = res['results'] ?? res['data'] ?? [];
      if (mounted) setState(() { _messages = list is List ? list : []; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _sendMessage() async {
    if (_msgController.text.trim().isEmpty) return;
    
    final content = _msgController.text.trim();
    _msgController.clear();
    
    try {
      await _api.post(ApiEndpoints.messages, {'contenu': content});
      _loadMessages();
    } catch (_) {
      // Erreur d'envoi
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.read<AuthProvider>().user;

    return Scaffold(
      appBar: AppBar(title: const Text('Messagerie')),
      drawer: const AppDrawer(),
      body: Column(
        children: [
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _messages.isEmpty
                    ? const Center(child: Text('Aucun message. Commencez la discussion!', style: TextStyle(color: AppColors.textGrey)))
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        reverse: true, // Pour afficher les nouveaux messages en bas s'ils sont triés, sinon false
                        itemCount: _messages.length,
                        itemBuilder: (context, index) {
                          final msg = _messages[_messages.length - 1 - index]; // Affichage ordre chronologique inverse
                          bool isMe = msg['expediteur_username'] == user?.username || msg['expediteur'] == user?.id;
                          
                          return Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                            child: Container(
                              padding: const EdgeInsets.all(12),
                              constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                              decoration: BoxDecoration(
                                color: isMe ? AppColors.primaryGreen : AppColors.white,
                                borderRadius: BorderRadius.only(
                                  topLeft: const Radius.circular(16),
                                  topRight: const Radius.circular(16),
                                  bottomLeft: Radius.circular(isMe ? 16 : 0),
                                  bottomRight: Radius.circular(isMe ? 0 : 16),
                                ),
                                border: isMe ? null : Border.all(color: AppColors.primaryGold.withOpacity(0.3)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  if (!isMe)
                                    Text(
                                      msg['expediteur_nom'] ?? 'Membre',
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: AppColors.primaryGold),
                                    ),
                                  if (!isMe) const SizedBox(height: 4),
                                  Text(
                                    msg['contenu'] ?? '',
                                    style: TextStyle(color: isMe ? AppColors.white : AppColors.textDark, fontSize: 14),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.white,
              boxShadow: [
                BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, -2))
              ],
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _msgController,
                    decoration: InputDecoration(
                      hintText: 'Votre message...',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide.none),
                      filled: true,
                      fillColor: Colors.grey.shade100,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                CircleAvatar(
                  backgroundColor: AppColors.primaryGold,
                  radius: 22,
                  child: IconButton(
                    icon: const Icon(Icons.send, color: AppColors.white, size: 20),
                    onPressed: _sendMessage,
                  ),
                )
              ],
            ),
          )
        ],
      ),
    );
  }
}
