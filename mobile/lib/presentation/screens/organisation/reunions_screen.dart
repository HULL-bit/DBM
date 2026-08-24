import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/colors.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../data/services/api_service.dart';
import '../../widgets/app_drawer.dart';

class ReunionsScreen extends StatefulWidget {
  const ReunionsScreen({super.key});

  @override
  State<ReunionsScreen> createState() => _ReunionsScreenState();
}

class _ReunionsScreenState extends State<ReunionsScreen> {
  final _api = ApiService();
  List<dynamic> _reunions = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await _api.get(ApiEndpoints.reunions);
      if (mounted) {
        setState(() {
          _reunions = data['results'] ?? [];
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Réunions')),
      drawer: const AppDrawer(),
      body: RefreshIndicator(
        onRefresh: _load,
        color: AppColors.primaryGreen,
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: AppColors.primaryGreen))
            : _reunions.isEmpty
                ? const Center(child: Text('Aucune réunion'))
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _reunions.length,
                    itemBuilder: (_, i) => _ReunionCard(data: _reunions[i]),
                  ),
      ),
    );
  }
}

class _ReunionCard extends StatelessWidget {
  final dynamic data;
  const _ReunionCard({required this.data});

  @override
  Widget build(BuildContext context) {
    final date = DateTime.tryParse(data['date'] ?? data['date_reunion'] ?? '');
    final type = data['type_reunion'] is Map
        ? data['type_reunion']['nom'] ?? ''
        : data['type_reunion']?.toString() ?? '';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.primaryGold.withValues(alpha: 0.3)),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: AppColors.darkGreen,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(13)),
            ),
            child: Row(
              children: [
                const Icon(Icons.meeting_room, color: AppColors.white, size: 18),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    data['titre'] ?? data['objet'] ?? 'Réunion',
                    style: const TextStyle(
                      color: AppColors.white,
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (date != null)
                  _InfoRow(
                    icon: Icons.calendar_today,
                    text: DateFormat('EEEE d MMMM yyyy, HH:mm', 'fr_FR').format(date),
                    color: AppColors.primaryGreen,
                  ),
                if (data['lieu'] != null)
                  _InfoRow(
                    icon: Icons.location_on,
                    text: data['lieu'],
                    color: AppColors.primaryGold,
                  ),
                if (type.isNotEmpty)
                  _InfoRow(
                    icon: Icons.category_outlined,
                    text: type,
                    color: AppColors.info,
                  ),
                if (data['ordre_du_jour'] != null) ...[
                  const SizedBox(height: 8),
                  Text('Ordre du jour:',
                      style: const TextStyle(
                          fontWeight: FontWeight.w600, fontSize: 12)),
                  const SizedBox(height: 4),
                  Text(
                    data['ordre_du_jour'],
                    style: Theme.of(context).textTheme.bodyMedium,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String text;
  final Color color;
  const _InfoRow({required this.icon, required this.text, required this.color});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 8),
          Expanded(
            child: Text(text,
                style: TextStyle(
                    fontSize: 12, color: color, fontWeight: FontWeight.w500)),
          ),
        ],
      ),
    );
  }
}
