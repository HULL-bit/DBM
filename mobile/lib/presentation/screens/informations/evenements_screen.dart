import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/colors.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../data/services/api_service.dart';
import '../../widgets/app_drawer.dart';

class EvenementsScreen extends StatefulWidget {
  const EvenementsScreen({super.key});

  @override
  State<EvenementsScreen> createState() => _EvenementsScreenState();
}

class _EvenementsScreenState extends State<EvenementsScreen> {
  final _api = ApiService();
  List<dynamic> _evenements = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await _api.get(ApiEndpoints.evenements);
      if (mounted) {
        setState(() {
          _evenements = data['results'] ?? data['data'] ?? [];
          if (_evenements.isEmpty && data.containsKey('id')) {
            _evenements = [data];
          }
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
      appBar: AppBar(
        title: const Text('Événements'),
        leading: IconButton(
          icon: const Icon(Icons.menu),
          onPressed: () => Scaffold.of(context).openDrawer(),
        ),
      ),
      drawer: const AppDrawer(),
      body: RefreshIndicator(
        onRefresh: _load,
        color: AppColors.primaryGreen,
        child: _loading
            ? const Center(
                child: CircularProgressIndicator(color: AppColors.primaryGreen))
            : _evenements.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.event_busy,
                            size: 64,
                            color: AppColors.textGrey.withValues(alpha: 0.4)),
                        const SizedBox(height: 16),
                        Text('Aucun événement',
                            style: Theme.of(context).textTheme.titleMedium),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _evenements.length,
                    itemBuilder: (ctx, i) =>
                        _EvenementCard(data: _evenements[i]),
                  ),
      ),
    );
  }
}

class _EvenementCard extends StatelessWidget {
  final dynamic data;
  const _EvenementCard({required this.data});

  @override
  Widget build(BuildContext context) {
    final dateDebut = DateTime.tryParse(data['date_debut'] ?? '');
    // dateFin disponible si besoin d'afficher une plage

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.primaryGold.withValues(alpha: 0.3)),
        boxShadow: [
          BoxShadow(
            color: AppColors.primaryGreen.withValues(alpha: 0.06),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // En-tête coloré
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              gradient: AppColors.primaryGradient,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(13)),
            ),
            child: Row(
              children: [
                const Icon(Icons.event, color: AppColors.white, size: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    data['titre'] ?? '',
                    style: const TextStyle(
                      color: AppColors.white,
                      fontWeight: FontWeight.w600,
                      fontSize: 15,
                    ),
                  ),
                ),
                _StatutBadge(data['statut'] ?? 'a_venir'),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (data['description'] != null) ...[
                  Text(
                    data['description'],
                    style: Theme.of(context).textTheme.bodyMedium,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 10),
                ],
                Row(
                  children: [
                    const Icon(Icons.calendar_today,
                        size: 14, color: AppColors.primaryGreen),
                    const SizedBox(width: 6),
                    Text(
                      dateDebut != null
                          ? DateFormat('EEEE d MMMM yyyy', 'fr_FR')
                              .format(dateDebut)
                          : '-',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.primaryGreen,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
                if (data['lieu'] != null) ...[
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.location_on,
                          size: 14, color: AppColors.primaryGold),
                      const SizedBox(width: 6),
                      Text(
                        data['lieu'],
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.primaryGold,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
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

class _StatutBadge extends StatelessWidget {
  final String statut;
  const _StatutBadge(this.statut);

  @override
  Widget build(BuildContext context) {
    Color color;
    String label;
    switch (statut) {
      case 'en_cours':
        color = AppColors.success;
        label = 'En cours';
        break;
      case 'termine':
        color = AppColors.textGrey;
        label = 'Terminé';
        break;
      default:
        color = AppColors.primaryGold;
        label = 'À venir';
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.5)),
      ),
      child: Text(label,
          style: TextStyle(
              color: color, fontSize: 10, fontWeight: FontWeight.w600)),
    );
  }
}
