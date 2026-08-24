import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/colors.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../data/services/api_service.dart';
import '../../../data/providers/auth_provider.dart';
import '../../widgets/app_drawer.dart';

class MessagerieScreen extends StatefulWidget {
  const MessagerieScreen({super.key});

  @override
  State<MessagerieScreen> createState() => _MessagerieScreenState();
}

class _MessagerieScreenState extends State<MessagerieScreen> {
  final _api = ApiService();
  List<dynamic> _messages = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await _api.get(ApiEndpoints.messages);
      if (mounted) {
        setState(() {
          _messages = data['results'] ?? [];
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _showNewMessage() {
    final msgCtrl = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(ctx).viewInsets.bottom,
          left: 20,
          right: 20,
          top: 20,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Text('Nouveau message',
                    style: TextStyle(
                        fontSize: 16, fontWeight: FontWeight.bold)),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(ctx),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: msgCtrl,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'Votre message',
                hintText: 'Saisissez votre message...',
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                icon: const Icon(Icons.send),
                label: const Text('Envoyer'),
                onPressed: () async {
                  final text = msgCtrl.text.trim();
                  if (text.isEmpty) return;
                  try {
                    await _api.post(ApiEndpoints.messages, {'contenu': text});
                    if (ctx.mounted) Navigator.pop(ctx);
                    _load();
                  } catch (_) {}
                },
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final me = context.read<AuthProvider>().user;

    return Scaffold(
      appBar: AppBar(title: const Text('Messagerie')),
      drawer: const AppDrawer(),
      floatingActionButton: FloatingActionButton(
        onPressed: _showNewMessage,
        backgroundColor: AppColors.primaryGreen,
        child: const Icon(Icons.edit, color: AppColors.white),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        color: AppColors.primaryGreen,
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: AppColors.primaryGreen))
            : _messages.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.chat_bubble_outline,
                            size: 64,
                            color: AppColors.textGrey.withValues(alpha: 0.4)),
                        const SizedBox(height: 16),
                        const Text('Aucun message'),
                        const SizedBox(height: 8),
                        ElevatedButton.icon(
                          icon: const Icon(Icons.edit),
                          label: const Text('Nouveau message'),
                          onPressed: _showNewMessage,
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _messages.length,
                    itemBuilder: (_, i) {
                      final msg = _messages[i];
                      final exp = msg['expediteur'] is Map
                          ? msg['expediteur']['username'] ?? ''
                          : '';
                      final dest = msg['destinataire'] is Map
                          ? msg['destinataire']['username'] ?? ''
                          : '';
                      final isMine = me?.username == exp;
                      final lu = msg['lu'] ?? false;
                      final date = DateTime.tryParse(msg['date_envoi'] ?? '');

                      return Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: isMine
                              ? AppColors.primaryGreen.withValues(alpha: 0.06)
                              : AppColors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: lu
                                ? AppColors.primaryGold.withValues(alpha: 0.2)
                                : AppColors.primaryGreen.withValues(alpha: 0.4),
                          ),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            CircleAvatar(
                              radius: 20,
                              backgroundColor: isMine
                                  ? AppColors.primaryGreen
                                  : AppColors.primaryGold,
                              child: Text(
                                (isMine ? exp : dest).isNotEmpty
                                    ? (isMine ? exp : dest)[0].toUpperCase()
                                    : '?',
                                style: const TextStyle(
                                    color: AppColors.white, fontSize: 14),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Text(
                                        isMine ? 'À: $dest' : 'De: $exp',
                                        style: const TextStyle(
                                            fontWeight: FontWeight.w600,
                                            fontSize: 12),
                                      ),
                                      const Spacer(),
                                      if (!lu && !isMine)
                                        Container(
                                          width: 8,
                                          height: 8,
                                          decoration: const BoxDecoration(
                                            color: AppColors.primaryGreen,
                                            shape: BoxShape.circle,
                                          ),
                                        ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    msg['contenu'] ?? '',
                                    style: const TextStyle(fontSize: 13),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  if (date != null)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 4),
                                      child: Text(
                                        DateFormat('d MMM, HH:mm', 'fr_FR')
                                            .format(date),
                                        style: const TextStyle(
                                            fontSize: 10,
                                            color: AppColors.textGrey),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}
