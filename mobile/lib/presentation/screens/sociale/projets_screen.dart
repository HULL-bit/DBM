import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/colors.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../data/services/api_service.dart';
import '../../widgets/app_drawer.dart';

class ProjetsSociauxScreen extends StatefulWidget {
  const ProjetsSociauxScreen({super.key});

  @override
  State<ProjetsSociauxScreen> createState() => _ProjetsSociauxScreenState();
}

class _ProjetsSociauxScreenState extends State<ProjetsSociauxScreen> {
  final _api = ApiService();
  List<dynamic> _projets = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await _api.get(ApiEndpoints.projetsSociaux);
      if (mounted) {
        setState(() {
          _projets = data['results'] ?? [];
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
      appBar: AppBar(title: const Text('Projets sociaux')),
      drawer: const AppDrawer(),
      body: RefreshIndicator(
        onRefresh: _load,
        color: AppColors.primaryGreen,
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: AppColors.primaryGreen))
            : _projets.isEmpty
                ? const Center(child: Text('Aucun projet social'))
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _projets.length,
                    itemBuilder: (_, i) => _ProjetCard(data: _projets[i]),
                  ),
      ),
    );
  }
}

class _ProjetCard extends StatelessWidget {
  final dynamic data;
  const _ProjetCard({required this.data});

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat('#,##0', 'fr_FR');
    final budget = double.tryParse(data['budget']?.toString() ?? '0') ?? 0;

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.primaryGold.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: const BoxDecoration(
              color: AppColors.primaryGreen,
              borderRadius: BorderRadius.vertical(top: Radius.circular(13)),
            ),
            child: Row(
              children: [
                const Icon(Icons.handshake, color: AppColors.white, size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    data['titre'] ?? data['nom'] ?? '',
                    style: const TextStyle(
                      color: AppColors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                    ),
                  ),
                ),
                if (data['statut'] != null)
                  _StatutChip(data['statut']),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (data['description'] != null)
                  Text(
                    data['description'],
                    style: Theme.of(context).textTheme.bodyMedium,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                  ),
                if (budget > 0) ...[
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      const Icon(Icons.account_balance_wallet,
                          size: 16, color: AppColors.primaryGold),
                      const SizedBox(width: 6),
                      Text(
                        'Budget: ${fmt.format(budget)} FCFA',
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          color: AppColors.primaryGold,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ],
                if (data['beneficiaires_count'] != null) ...[
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.people_outlined,
                          size: 16, color: AppColors.textGrey),
                      const SizedBox(width: 6),
                      Text(
                        '${data['beneficiaires_count']} bénéficiaires',
                        style: const TextStyle(
                            fontSize: 12, color: AppColors.textGrey),
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

class _StatutChip extends StatelessWidget {
  final String statut;
  const _StatutChip(this.statut);

  @override
  Widget build(BuildContext context) {
    Color color;
    String label;
    switch (statut) {
      case 'en_cours': color = AppColors.info; label = 'En cours'; break;
      case 'termine': color = AppColors.success; label = 'Terminé'; break;
      case 'planifie': color = AppColors.warning; label = 'Planifié'; break;
      default: color = AppColors.textGrey; label = statut;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(label,
          style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w600)),
    );
  }
}
