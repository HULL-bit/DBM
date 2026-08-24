import 'package:flutter/material.dart';
import '../../core/constants/colors.dart';
import '../../data/services/api_service.dart';
import 'app_drawer.dart';

class GenericListScreen extends StatefulWidget {
  final String title;
  final String endpoint;
  final String emptyMessage;
  final Widget Function(dynamic item) itemBuilder;
  final Widget? floatingActionButton;
  final Widget? header;

  const GenericListScreen({
    super.key,
    required this.title,
    required this.endpoint,
    required this.itemBuilder,
    this.emptyMessage = 'Aucun élément trouvé',
    this.floatingActionButton,
    this.header,
  });

  @override
  State<GenericListScreen> createState() => GenericListScreenState();
}

class GenericListScreenState extends State<GenericListScreen> {
  final ApiService _api = ApiService();
  bool _loading = true;
  List<dynamic> _items = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> loadData() => _loadData();

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final res = await _api.get(widget.endpoint);
      final list = res['results'] ?? res['data'] ?? [];
      if (mounted) {
        setState(() {
          _items = list is List ? list : [];
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
      appBar: AppBar(title: Text(widget.title)),
      drawer: const AppDrawer(),
      floatingActionButton: widget.floatingActionButton,
      body: RefreshIndicator(
        onRefresh: _loadData,
        color: AppColors.primaryGreen,
        child: Column(
          children: [
            if (widget.header != null) widget.header!,
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _items.isEmpty
                      ? Center(child: Text(widget.emptyMessage, style: const TextStyle(color: AppColors.textGrey)))
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _items.length,
                          itemBuilder: (context, index) => widget.itemBuilder(_items[index]),
                        ),
            ),
          ],
        ),
      ),
    );
  }
}
