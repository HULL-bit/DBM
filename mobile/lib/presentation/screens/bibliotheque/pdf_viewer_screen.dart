import 'package:flutter/material.dart';
import 'package:syncfusion_flutter_pdfviewer/pdfviewer.dart';
import '../../../core/constants/colors.dart';

/// Visionneuse PDF intégrée : le document reste consultable dans l'application,
/// jamais ouvert dans une appli externe. Recherche de texte dans le document
/// via l'icône loupe de l'AppBar.
class PdfViewerScreen extends StatefulWidget {
  final String url;
  final String title;

  const PdfViewerScreen({super.key, required this.url, required this.title});

  @override
  State<PdfViewerScreen> createState() => _PdfViewerScreenState();
}

class _PdfViewerScreenState extends State<PdfViewerScreen> {
  final PdfViewerController _controller = PdfViewerController();
  final TextEditingController _searchController = TextEditingController();
  PdfTextSearchResult _searchResult = PdfTextSearchResult();
  bool _searching = false;
  String? _error;

  @override
  void dispose() {
    _searchController.dispose();
    _searchResult.removeListener(_onSearchResultChanged);
    super.dispose();
  }

  void _onSearchResultChanged() {
    if (mounted) setState(() {});
  }

  void _lancerRecherche(String query) {
    if (query.trim().isEmpty) return;
    _searchResult.removeListener(_onSearchResultChanged);
    _searchResult = _controller.searchText(query.trim());
    _searchResult.addListener(_onSearchResultChanged);
    setState(() {});
  }

  void _fermerRecherche() {
    _searchResult.clear();
    setState(() {
      _searching = false;
      _searchController.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: AppColors.primaryGreen,
        title: _searching
            ? TextField(
                controller: _searchController,
                autofocus: true,
                style: const TextStyle(color: Colors.white),
                cursorColor: Colors.white,
                textInputAction: TextInputAction.search,
                decoration: const InputDecoration(
                  hintText: 'Rechercher dans le document...',
                  hintStyle: TextStyle(color: Colors.white70),
                  border: InputBorder.none,
                ),
                onSubmitted: _lancerRecherche,
              )
            : Text(widget.title, overflow: TextOverflow.ellipsis),
        actions: [
          if (_searching && _searchResult.hasResult) ...[
            Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: Text(
                  '${_searchResult.currentInstanceIndex}/${_searchResult.totalInstanceCount}',
                  style: const TextStyle(fontSize: 13, color: Colors.white),
                ),
              ),
            ),
            IconButton(
              icon: const Icon(Icons.keyboard_arrow_up),
              onPressed: () => _searchResult.previousInstance(),
            ),
            IconButton(
              icon: const Icon(Icons.keyboard_arrow_down),
              onPressed: () => _searchResult.nextInstance(),
            ),
          ],
          IconButton(
            icon: Icon(_searching ? Icons.close : Icons.search),
            onPressed: () => _searching ? _fermerRecherche() : setState(() => _searching = true),
          ),
        ],
      ),
      body: _error != null
          ? Center(child: Text(_error!, style: const TextStyle(color: Colors.white70)))
          : SfPdfViewer.network(
              widget.url,
              controller: _controller,
              onDocumentLoadFailed: (details) => setState(() => _error = 'Impossible de charger le document.'),
            ),
    );
  }
}
