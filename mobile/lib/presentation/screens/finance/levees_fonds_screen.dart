import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/colors.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../data/services/api_service.dart';
import '../../widgets/app_drawer.dart';

class LeveesFondsScreen extends StatefulWidget {
  const LeveesFondsScreen({super.key});

  @override
  State<LeveesFondsScreen> createState() => _LeveesFondsScreenState();
}

class _LeveesFondsScreenState extends State<LeveesFondsScreen> {
  final _api = ApiService();
  List<dynamic> _levees = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await _api.get(ApiEndpoints.leveesFonds);
      if (mounted) {
        setState(() {
          _levees = data['results'] ?? [];
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
      appBar: AppBar(title: const Text('Levées de fonds')),
      drawer: const AppDrawer(),
      body: RefreshIndicator(
        onRefresh: _load,
        color: AppColors.primaryGreen,
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: AppColors.primaryGreen))
            : _levees.isEmpty
                ? const Center(child: Text('Aucune levée de fonds'))
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _levees.length,
                    itemBuilder: (_, i) => _LeveeCard(data: _levees[i]),
                  ),
      ),
    );
  }
}

class _LeveeCard extends StatelessWidget {
  final dynamic data;
  const _LeveeCard({required this.data});

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat('#,##0', 'fr_FR');
    final objectif = double.tryParse(data['objectif']?.toString() ?? '0') ?? 0;
    final collecte = double.tryParse(data['montant_collecte']?.toString() ?? '0') ?? 0;
    final progress = objectif > 0 ? (collecte / objectif).clamp(0.0, 1.0) : 0.0;

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
            decoration: BoxDecoration(
              gradient: AppColors.goldGradient,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(13)),
            ),
            child: Row(
              children: [
                const Icon(Icons.volunteer_activism, color: AppColors.white, size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    data['titre'] ?? '',
                    style: const TextStyle(
                      color: AppColors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
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
                if (data['description'] != null)
                  Text(
                    data['description'],
                    style: Theme.of(context).textTheme.bodyMedium,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Collecté',
                            style: TextStyle(fontSize: 11, color: AppColors.textGrey)),
                        Text('${fmt.format(collecte)} FCFA',
                            style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                color: AppColors.primaryGreen,
                                fontSize: 15)),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        const Text('Objectif',
                            style: TextStyle(fontSize: 11, color: AppColors.textGrey)),
                        Text('${fmt.format(objectif)} FCFA',
                            style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                color: AppColors.primaryGold,
                                fontSize: 15)),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: LinearProgressIndicator(
                    value: progress,
                    minHeight: 8,
                    backgroundColor: AppColors.lightBeige,
                    valueColor:
                        const AlwaysStoppedAnimation<Color>(AppColors.primaryGreen),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  '${(progress * 100).toStringAsFixed(1)}% atteint',
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppColors.primaryGreen,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
