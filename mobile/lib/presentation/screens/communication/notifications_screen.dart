import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/colors.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../data/services/api_service.dart';
import '../../../data/providers/auth_provider.dart';
import '../../widgets/app_drawer.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final _api = ApiService();
  List<dynamic> _notifs = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await _api.get(ApiEndpoints.notifications);
      if (mounted) {
        setState(() {
          _notifs = data['results'] ?? [];
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.read<AuthProvider>().user;
    final isAdmin = user?.isAdmin == true || user?.isJewrinCommunication == true;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          if (_notifs.any((n) => !(n['est_lue'] ?? false)))
            TextButton(
              onPressed: _markAllRead,
              child: const Text('Tout lire',
                  style: TextStyle(color: AppColors.primaryGold, fontSize: 12)),
            ),
        ],
      ),
      drawer: const AppDrawer(),
      floatingActionButton: isAdmin
          ? FloatingActionButton(
              backgroundColor: AppColors.primaryGreen,
              onPressed: () => _showNotifForm(context),
              child: const Icon(Icons.add, color: AppColors.white),
            )
          : null,
      body: RefreshIndicator(
        onRefresh: _load,
        color: AppColors.primaryGreen,
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: AppColors.primaryGreen))
            : _notifs.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.notifications_none,
                            size: 64,
                            color: AppColors.textGrey.withValues(alpha: 0.4)),
                        const SizedBox(height: 16),
                        const Text('Aucune notification'),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _notifs.length,
                    itemBuilder: (_, i) => _NotifTile(
                      data: _notifs[i],
                      isAdmin: isAdmin,
                      onTap: () => _markRead(_notifs[i]),
                      onEdit: () => _showNotifForm(context, item: _notifs[i]),
                      onDelete: () => _deleteNotif(_notifs[i]),
                    ),
                  ),
      ),
    );
  }

  Future<void> _markRead(dynamic notif) async {
    if (notif['est_lue'] == true) return;
    try {
      await _api.patch('${ApiEndpoints.notifications}${notif['id']}/', {'est_lue': true});
      _load();
    } catch (_) {}
  }

  Future<void> _markAllRead() async {
    for (final n in _notifs.where((n) => !(n['est_lue'] ?? false))) {
      try {
        await _api.patch('${ApiEndpoints.notifications}${n['id']}/', {'est_lue': true});
      } catch (_) {}
    }
    _load();
  }

  Future<void> _deleteNotif(dynamic notif) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Supprimer'),
        content: const Text('Supprimer cette notification ?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );
    if (confirm == true) {
      try {
        await _api.delete('${ApiEndpoints.notifications}${notif['id']}/');
        _load();
      } catch (e) {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
      }
    }
  }

  void _showNotifForm(BuildContext context, {dynamic item}) {
    final titreCtrl = TextEditingController(text: item?['titre']);
    final messageCtrl = TextEditingController(text: item?['message']);
    String selectedType = item?['type_notification'] ?? 'info';

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text(item == null ? 'Nouvelle Notification' : 'Modifier Notification'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: titreCtrl,
                  decoration: const InputDecoration(labelText: 'Titre *'),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: messageCtrl,
                  decoration: const InputDecoration(labelText: 'Message *'),
                  maxLines: 3,
                ),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  value: selectedType,
                  decoration: const InputDecoration(labelText: 'Type'),
                  items: const [
                    DropdownMenuItem(value: 'info', child: Text('Information')),
                    DropdownMenuItem(value: 'succes', child: Text('Succ\u00e8s')),
                    DropdownMenuItem(value: 'avertissement', child: Text('Avertissement')),
                    DropdownMenuItem(value: 'erreur', child: Text('Erreur')),
                    DropdownMenuItem(value: 'evenement', child: Text('\u00c9v\u00e9nement')),
                    DropdownMenuItem(value: 'finance', child: Text('Finance')),
                    DropdownMenuItem(value: 'kamil', child: Text('Kamil')),
                    DropdownMenuItem(value: 'systeme', child: Text('Syst\u00e8me')),
                  ],
                  onChanged: (v) => setDialogState(() => selectedType = v!),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
            ElevatedButton(
              onPressed: () async {
                if (titreCtrl.text.trim().isEmpty || messageCtrl.text.trim().isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Titre et message requis'), backgroundColor: AppColors.error),
                  );
                  return;
                }
                try {
                  final data = {
                    'titre': titreCtrl.text.trim(),
                    'message': messageCtrl.text.trim(),
                    'type_notification': selectedType,
                  };
                  if (item == null) {
                    await _api.post(ApiEndpoints.notifications, data);
                  } else {
                    await _api.patch('${ApiEndpoints.notifications}${item['id']}/', data);
                  }
                  Navigator.pop(ctx);
                  _load();
                } catch (e) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Erreur: $e'), backgroundColor: AppColors.error),
                  );
                }
              },
              child: const Text('Enregistrer'),
            ),
          ],
        ),
      ),
    );
  }
}

class _NotifTile extends StatelessWidget {
  final dynamic data;
  final VoidCallback onTap;
  final bool isAdmin;
  final VoidCallback? onEdit;
  final VoidCallback? onDelete;
  const _NotifTile({required this.data, required this.onTap, this.isAdmin = false, this.onEdit, this.onDelete});

  @override
  Widget build(BuildContext context) {
    final lu = data['est_lue'] ?? false;
    final date = DateTime.tryParse(data['date_creation'] ?? '');

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: lu ? AppColors.white : AppColors.primaryGreen.withValues(alpha: 0.05),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: lu
                ? AppColors.primaryGold.withValues(alpha: 0.2)
                : AppColors.primaryGreen.withValues(alpha: 0.3),
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: lu
                    ? AppColors.textGrey.withValues(alpha: 0.1)
                    : AppColors.primaryGreen.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(
                _typeIcon(data['type_notification'] ?? 'info'),
                color: lu ? AppColors.textGrey : AppColors.primaryGreen,
                size: 18,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          data['titre'] ?? '',
                          style: TextStyle(
                            fontWeight: lu ? FontWeight.w400 : FontWeight.w600,
                            fontSize: 13,
                          ),
                        ),
                      ),
                      if (!lu)
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
                    data['message'] ?? '',
                    style: Theme.of(context).textTheme.bodyMedium,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (date != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        DateFormat('d MMM yyyy, HH:mm', 'fr_FR').format(date),
                        style: const TextStyle(fontSize: 10, color: AppColors.textGrey),
                      ),
                    ),
                  if (isAdmin)
                    Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          InkWell(
                            onTap: onEdit,
                            borderRadius: BorderRadius.circular(6),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.primaryGold.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.edit, size: 14, color: AppColors.primaryGold),
                                  SizedBox(width: 4),
                                  Text('Modifier', style: TextStyle(fontSize: 11, color: AppColors.primaryGold, fontWeight: FontWeight.w500)),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          InkWell(
                            onTap: onDelete,
                            borderRadius: BorderRadius.circular(6),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.error.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.delete, size: 14, color: AppColors.error),
                                  SizedBox(width: 4),
                                  Text('Supprimer', style: TextStyle(fontSize: 11, color: AppColors.error, fontWeight: FontWeight.w500)),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  IconData _typeIcon(String type) {
    switch (type) {
      case 'finance': return Icons.payments_outlined;
      case 'evenement': return Icons.event_outlined;
      case 'kamil': return Icons.menu_book_outlined;
      case 'message': return Icons.chat_outlined;
      default: return Icons.notifications_outlined;
    }
  }
}
