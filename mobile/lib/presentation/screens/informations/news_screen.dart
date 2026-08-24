import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/colors.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../data/services/api_service.dart';
import '../../widgets/app_drawer.dart';

class NewsScreen extends StatefulWidget {
  const NewsScreen({super.key});

  @override
  State<NewsScreen> createState() => _NewsScreenState();
}

class _NewsScreenState extends State<NewsScreen> {
  final _api = ApiService();
  List<dynamic> _news = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await _api.get(ApiEndpoints.news);
      if (mounted) {
        setState(() {
          _news = data['results'] ?? [];
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
      appBar: AppBar(title: const Text('Actualités')),
      drawer: const AppDrawer(),
      body: RefreshIndicator(
        onRefresh: _load,
        color: AppColors.primaryGreen,
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: AppColors.primaryGreen))
            : _news.isEmpty
                ? const Center(child: Text('Aucune actualité'))
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _news.length,
                    itemBuilder: (_, i) => _NewsCard(data: _news[i]),
                  ),
      ),
    );
  }
}

class _NewsCard extends StatelessWidget {
  final dynamic data;
  const _NewsCard({required this.data});

  @override
  Widget build(BuildContext context) {
    final date = DateTime.tryParse(data['date_publication'] ?? '');
    final auteur = data['auteur'] is Map
        ? data['auteur']['username']
        : data['auteur']?.toString();

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
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: AppColors.primaryGold.withValues(alpha: 0.1),
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(13)),
              border: Border(
                bottom: BorderSide(
                    color: AppColors.primaryGold.withValues(alpha: 0.3)),
              ),
            ),
            child: Row(
              children: [
                const Icon(Icons.newspaper,
                    color: AppColors.primaryGold, size: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    data['titre'] ?? '',
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                      color: AppColors.textDark,
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
                Text(
                  data['contenu'] ?? '',
                  style: Theme.of(context).textTheme.bodyMedium,
                  maxLines: 4,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    if (auteur != null) ...[
                      const Icon(Icons.person, size: 12, color: AppColors.textGrey),
                      const SizedBox(width: 4),
                      Text(auteur,
                          style: const TextStyle(
                              fontSize: 11, color: AppColors.textGrey)),
                      const SizedBox(width: 12),
                    ],
                    const Icon(Icons.schedule, size: 12, color: AppColors.textGrey),
                    const SizedBox(width: 4),
                    Text(
                      date != null
                          ? DateFormat('d MMM yyyy', 'fr_FR').format(date)
                          : '',
                      style: const TextStyle(
                          fontSize: 11, color: AppColors.textGrey),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
