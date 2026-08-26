import 'package:flutter/material.dart';
import '../../core/constants/api_endpoints.dart';
import '../../core/constants/colors.dart';
import '../../data/services/api_service.dart';
import '../widgets/app_drawer.dart';
import '../widgets/safe_avatar.dart';
import 'message_chat_screen.dart';

/// Liste des contacts (tous les membres de la daara) avec un aperçu du dernier
/// message échangé — le fil de discussion d'un contact précis s'ouvre dans un
/// écran séparé (MessageChatScreen), pour que le retour ramène naturellement
/// à cette liste plutôt que de sauter directement au tableau de bord.
class MessagerieScreen extends StatefulWidget {
  const MessagerieScreen({super.key});

  @override
  State<MessagerieScreen> createState() => _MessagerieScreenState();
}

class _MessagerieScreenState extends State<MessagerieScreen> {
  final ApiService _api = ApiService();
  bool _loading = true;
  List<dynamic> _conversations = [];
  String _search = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await _api.get('${ApiEndpoints.messages}conversations/');
      final list = res['results'] ?? res['data'] ?? (res is List ? res : []);
      if (mounted) {
        setState(() {
          _conversations = list is List ? list : [];
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _search.isEmpty
        ? _conversations
        : _conversations
            .where((c) => (c['contact_name'] ?? '').toString().toLowerCase().contains(_search.toLowerCase()))
            .toList();

    return Scaffold(
      appBar: AppBar(title: const Text('Messagerie')),
      drawer: const AppDrawer(),
      body: Column(
        children: [
          Container(
            color: AppColors.primaryGreen,
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: TextField(
              style: const TextStyle(color: AppColors.white),
              decoration: InputDecoration(
                hintText: 'Rechercher un membre...',
                hintStyle: TextStyle(color: AppColors.white.withValues(alpha: 0.6)),
                prefixIcon: const Icon(Icons.search, color: AppColors.white),
                filled: true,
                fillColor: AppColors.white.withValues(alpha: 0.15),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                contentPadding: const EdgeInsets.symmetric(vertical: 10),
              ),
              onChanged: (v) => setState(() => _search = v),
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _load,
              color: AppColors.primaryGreen,
              child: _loading
                  ? const Center(child: CircularProgressIndicator(color: AppColors.primaryGreen))
                  : filtered.isEmpty
                      ? ListView(
                          children: const [
                            SizedBox(height: 100),
                            Center(child: Text('Aucun membre trouvé', style: TextStyle(color: AppColors.textGrey))),
                          ],
                        )
                      : ListView.separated(
                          itemCount: filtered.length,
                          separatorBuilder: (_, __) => const Divider(height: 1),
                          itemBuilder: (context, index) {
                            final conv = filtered[index];
                            final lastMsg = conv['last_message'];
                            final unread = (conv['unread_count'] ?? 0) as int;
                            return ListTile(
                              leading: SafeAvatar(
                                photoUrl: conv['contact_photo'] as String?,
                                fallbackText: (conv['contact_name'] ?? '?').toString(),
                                backgroundColor: AppColors.primaryGreen,
                              ),
                              title: Text(
                                conv['contact_name'] ?? 'Membre',
                                style: TextStyle(fontWeight: unread > 0 ? FontWeight.bold : FontWeight.w600),
                              ),
                              subtitle: lastMsg != null
                                  ? Text(
                                      lastMsg['contenu'] ?? '',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(color: unread > 0 ? AppColors.textDark : AppColors.textGrey),
                                    )
                                  : const Text('Aucun message', style: TextStyle(color: AppColors.textGrey, fontStyle: FontStyle.italic)),
                              trailing: unread > 0
                                  ? CircleAvatar(
                                      radius: 11,
                                      backgroundColor: AppColors.primaryGold,
                                      child: Text('$unread', style: const TextStyle(color: AppColors.white, fontSize: 11)),
                                    )
                                  : const Icon(Icons.chevron_right, color: AppColors.textGrey),
                              onTap: () async {
                                await Navigator.of(context).push(
                                  MaterialPageRoute(builder: (_) => MessageChatScreen(contact: conv)),
                                );
                                _load();
                              },
                            );
                          },
                        ),
            ),
          ),
        ],
      ),
    );
  }
}
