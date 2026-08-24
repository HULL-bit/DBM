import 'package:flutter/material.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/constants/colors.dart';
import '../../../data/services/api_service.dart';
import '../../widgets/app_drawer.dart';
import '../../widgets/safe_avatar.dart';
import 'canal_chat_screen.dart';

class CanauxScreen extends StatefulWidget {
  const CanauxScreen({super.key});

  @override
  State<CanauxScreen> createState() => _CanauxScreenState();
}

class _CanauxScreenState extends State<CanauxScreen> {
  final ApiService _api = ApiService();
  bool _loading = true;
  List<dynamic> _canaux = [];
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await _api.get(ApiEndpoints.canaux);
      final list = res['results'] ?? res['data'] ?? [];
      if (mounted) {
        setState(() {
          _canaux = list is List ? list : [];
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = "Impossible de charger les canaux.";
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Canaux')),
      drawer: const AppDrawer(),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: AppColors.primaryGreen));
    }
    if (_error != null) {
      return ListView(
        children: [
          const SizedBox(height: 100),
          Center(child: Text(_error!, style: const TextStyle(color: AppColors.textGrey))),
        ],
      );
    }
    if (_canaux.isEmpty) {
      return ListView(
        children: const [
          SizedBox(height: 100),
          Center(
            child: Text(
              "Vous ne faites partie d'aucun canal pour l'instant.",
              style: TextStyle(color: AppColors.textGrey),
            ),
          ),
        ],
      );
    }
    return ListView.separated(
      itemCount: _canaux.length,
      separatorBuilder: (_, __) => const Divider(height: 1),
      itemBuilder: (context, index) {
        final canal = _canaux[index];
        return ListTile(
          leading: SafeAvatar(
            photoUrl: canal['image'] as String?,
            fallbackText: (canal['nom'] ?? '?').toString(),
            backgroundColor: AppColors.primaryGreen,
          ),
          title: Text(
            canal['nom'] ?? 'Canal',
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
          subtitle: Text('${canal['nb_membres'] ?? 0} membre(s)'),
          trailing: const Icon(Icons.chevron_right, color: AppColors.textGrey),
          onTap: () {
            Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => CanalChatScreen(canal: canal)),
            );
          },
        );
      },
    );
  }
}
