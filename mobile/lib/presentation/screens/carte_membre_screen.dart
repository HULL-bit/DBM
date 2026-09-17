import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:intl/intl.dart';
import 'package:open_file/open_file.dart';
import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:qr_flutter/qr_flutter.dart';

import '../../core/constants/api_endpoints.dart';
import '../../core/constants/colors.dart';
import '../../data/models/user_model.dart';

const _vert = Color(0xFF2D5F3F);
const _vertFonce = Color(0xFF1e4029);
const _or = Color(0xFFC9A961);
const _noir = Color(0xFF1A1A1A);
const _fond = Color(0xFFFBF6EC);

// Format carte bancaire (CR80) en points PDF, une face par page — même format que
// l'export web (85.6 x 54 mm), pour une impression recto-verso identique.
const double _cr80WidthMm = 85.6;
const double _cr80HeightMm = 54;

String _mediaUrl(String? path) {
  if (path == null || path.isEmpty) return '';
  return path.startsWith('http') ? path : '${ApiEndpoints.mediaBaseUrl}$path';
}

String _initiales(String nom) {
  final parts = nom.trim().split(RegExp(r'\s+')).where((s) => s.isNotEmpty).toList();
  if (parts.isEmpty) return '?';
  return parts.length > 1 ? '${parts.first[0]}${parts.last[0]}'.toUpperCase() : parts.first[0].toUpperCase();
}

/// Carte de membre (badge) recto/verso, identique dans son contenu et sa mise en page à
/// CarteMembre.jsx côté web : identité + QR code, exportable en PDF recto-verso au format
/// carte (CR80), une face par page — pour une impression identique à la version web.
class CarteMembreScreen extends StatefulWidget {
  final UserModel membre;
  const CarteMembreScreen({super.key, required this.membre});

  @override
  State<CarteMembreScreen> createState() => _CarteMembreScreenState();
}

class _CarteMembreScreenState extends State<CarteMembreScreen> {
  final GlobalKey _rectoKey = GlobalKey();
  final GlobalKey _versoKey = GlobalKey();
  bool _exporting = false;

  String get _identifiant => (widget.membre.numeroCarte?.isNotEmpty == true)
      ? widget.membre.numeroCarte!
      : '#${widget.membre.id.toString().padLeft(5, '0')}';

  String get _vCard {
    final m = widget.membre;
    final lignes = <String>[
      'BEGIN:VCARD',
      'VERSION:3.0',
      'N:${m.lastName ?? ''};${m.firstName ?? ''};;;',
      'FN:${'${m.firstName ?? ''} ${m.lastName ?? ''}'.trim()}',
      'ORG:Daara Barakatul Mahaahidi',
      'TITLE:${m.roleDisplay ?? m.role}',
    ];
    if (m.telephone?.isNotEmpty == true) lignes.add('TEL:${m.telephone}');
    if (m.email.isNotEmpty) lignes.add('EMAIL:${m.email}');
    if (m.adresse?.isNotEmpty == true) lignes.add('ADR:;;${m.adresse};;;;');
    final notes = [
      'Matricule: $_identifiant',
      if (m.dateNaissance != null) 'Né(e) le: ${DateFormat('yyyy-MM-dd').format(m.dateNaissance!)}',
      if (m.dateInscription != null) 'Membre depuis: ${DateFormat('d MMMM yyyy', 'fr_FR').format(m.dateInscription!)}',
      if (m.groupeSanguin?.isNotEmpty == true) 'Groupe sanguin: ${m.groupeSanguin}',
      if (m.profession?.isNotEmpty == true) 'Profession: ${m.profession}',
    ].join(' | ');
    lignes.add('NOTE:$notes');
    lignes.add('END:VCARD');
    return lignes.join('\n');
  }

  Future<Uint8List> _capture(GlobalKey key) async {
    final boundary = key.currentContext!.findRenderObject() as RenderRepaintBoundary;
    final image = await boundary.toImage(pixelRatio: 3);
    final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
    return byteData!.buffer.asUint8List();
  }

  Future<void> _exporterPdf() async {
    setState(() => _exporting = true);
    try {
      final rectoBytes = await _capture(_rectoKey);
      final versoBytes = await _capture(_versoKey);

      final doc = pw.Document();
      final pageFormat = PdfPageFormat(
        _cr80WidthMm * PdfPageFormat.mm,
        _cr80HeightMm * PdfPageFormat.mm,
        marginAll: 0,
      );
      doc.addPage(pw.Page(
        pageFormat: pageFormat,
        build: (ctx) => pw.Image(pw.MemoryImage(rectoBytes), fit: pw.BoxFit.fill),
      ));
      doc.addPage(pw.Page(
        pageFormat: pageFormat,
        build: (ctx) => pw.Image(pw.MemoryImage(versoBytes), fit: pw.BoxFit.fill),
      ));

      final dir = await getTemporaryDirectory();
      final file = File('${dir.path}/carte_membre_${widget.membre.username}.pdf');
      await file.writeAsBytes(await doc.save());
      await OpenFile.open(file.path);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur lors de l\'export : $e'), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _exporting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Carte de membre')),
      backgroundColor: AppColors.backgroundBeige,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            const Text('Recto', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textGrey)),
            const SizedBox(height: 8),
            RepaintBoundary(
              key: _rectoKey,
              child: _CarteRecto(membre: widget.membre, identifiant: _identifiant),
            ),
            const SizedBox(height: 24),
            const Text('Verso', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textGrey)),
            const SizedBox(height: 8),
            RepaintBoundary(
              key: _versoKey,
              child: _CarteVerso(membre: widget.membre, vCard: _vCard),
            ),
            const SizedBox(height: 24),
            OutlinedButton.icon(
              onPressed: _exporting ? null : _exporterPdf,
              icon: _exporting ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.picture_as_pdf),
              label: Text(_exporting ? 'Export en cours...' : 'Télécharger la carte (PDF recto-verso)'),
              style: OutlinedButton.styleFrom(foregroundColor: _vert, side: const BorderSide(color: _vert)),
            ),
          ],
        ),
      ),
    );
  }
}

/// Recto : logo/en-tête, photo + identité, encadré infos (adresse, naissance, adhésion,
/// délivrance, validité). Reproduit fidèlement CarteMembre.jsx (face recto).
class _CarteRecto extends StatelessWidget {
  final UserModel membre;
  final String identifiant;
  const _CarteRecto({required this.membre, required this.identifiant});

  @override
  Widget build(BuildContext context) {
    final m = membre;
    final nomComplet = '${m.firstName ?? ''} ${m.lastName ?? ''}'.trim();
    final dateNaissance = m.dateNaissance != null ? DateFormat('d MMMM yyyy', 'fr_FR').format(m.dateNaissance!) : '';
    final dateInscription = m.dateInscription != null ? DateFormat('MMMM yyyy', 'fr_FR').format(m.dateInscription!) : '';
    final dateDelivrance = m.dateDelivranceCarte != null ? DateFormat('d MMMM yyyy', 'fr_FR').format(m.dateDelivranceCarte!) : '';
    final dateExpiration = m.dateExpirationCarte != null
        ? DateFormat('d MMMM yyyy', 'fr_FR').format(m.dateExpirationCarte!)
        : '31 décembre ${DateTime.now().year}';

    return Container(
      width: 360,
      decoration: BoxDecoration(
        color: _fond,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _or.withValues(alpha: 0.4)),
        boxShadow: [BoxShadow(color: _vert.withValues(alpha: 0.18), blurRadius: 18, offset: const Offset(0, 6))],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: const BoxDecoration(gradient: LinearGradient(colors: [_vert, _vertFonce], begin: Alignment.topLeft, end: Alignment.bottomRight)),
            child: const Row(
              children: [
                Icon(Icons.mosque, color: Colors.white, size: 20),
                SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Daara Barakatul Mahaahidi', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                      Text('CARTE DE MEMBRE', style: TextStyle(color: _or, fontSize: 9, letterSpacing: 1)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: _mediaUrl(m.photo).isNotEmpty
                      ? Image.network(_mediaUrl(m.photo), width: 78, height: 78, fit: BoxFit.cover, errorBuilder: (_, __, ___) => _photoFallback(nomComplet))
                      : _photoFallback(nomComplet),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Nom : ${m.lastName?.isNotEmpty == true ? m.lastName! : '—'}', style: const TextStyle(fontWeight: FontWeight.bold, color: _vertFonce, fontSize: 13)),
                      Text('Prénom : ${m.firstName?.isNotEmpty == true ? m.firstName! : '—'}', style: const TextStyle(fontWeight: FontWeight.bold, color: _vertFonce, fontSize: 13)),
                      const SizedBox(height: 2),
                      Text(m.roleDisplay ?? m.role, style: const TextStyle(color: _vert, fontWeight: FontWeight.w600, fontSize: 11)),
                      Text('Matricule : $identifiant', style: const TextStyle(color: AppColors.textGrey, fontSize: 10)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 0, 14, 12),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(9),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8), border: Border.all(color: _or.withValues(alpha: 0.3))),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (m.adresse?.isNotEmpty == true) _ligne('Adresse', m.adresse!),
                  if (dateNaissance.isNotEmpty) _ligne('Né(e) le', dateNaissance),
                  if (dateInscription.isNotEmpty) _ligne('Date d\'adhésion', dateInscription),
                  if (dateDelivrance.isNotEmpty) _ligne('Délivrée le', dateDelivrance),
                  _ligne('Valide jusqu\'au', dateExpiration),
                ],
              ),
            ),
          ),
          Container(height: 4, decoration: const BoxDecoration(gradient: LinearGradient(colors: [_or, _vert]))),
        ],
      ),
    );
  }

  Widget _photoFallback(String nom) => Container(
        width: 78,
        height: 78,
        color: _vert,
        alignment: Alignment.center,
        child: Text(_initiales(nom), style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
      );

  Widget _ligne(String label, String valeur) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 1),
        child: RichText(
          text: TextSpan(
            style: const TextStyle(fontSize: 10, color: _noir),
            children: [
              TextSpan(text: '$label : ', style: const TextStyle(fontWeight: FontWeight.bold)),
              TextSpan(text: valeur),
            ],
          ),
        ),
      );
}

/// Verso : encadré (profession, groupe sanguin, contact, mention légale) + QR code.
/// Reproduit fidèlement CarteMembre.jsx (face verso).
class _CarteVerso extends StatelessWidget {
  final UserModel membre;
  final String vCard;
  const _CarteVerso({required this.membre, required this.vCard});

  @override
  Widget build(BuildContext context) {
    final m = membre;
    return Container(
      width: 360,
      height: 227,
      decoration: BoxDecoration(
        color: _fond,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _or.withValues(alpha: 0.4)),
        boxShadow: [BoxShadow(color: _vert.withValues(alpha: 0.18), blurRadius: 18, offset: const Offset(0, 6))],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          Container(height: 7, decoration: const BoxDecoration(gradient: LinearGradient(colors: [_vert, _or]))),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8), border: Border.all(color: _or.withValues(alpha: 0.3))),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.start,
                        children: [
                          if (m.profession?.isNotEmpty == true) _ligne('Profession', m.profession!),
                          if (m.groupeSanguin?.isNotEmpty == true) _ligne('Groupe sanguin', m.groupeSanguin!),
                          if (m.telephone?.isNotEmpty == true) _ligne('Contact', m.telephone!),
                          const SizedBox(height: 6),
                          const Text(
                            'Cette carte est strictement personnelle et ne peut être cédée à un tiers. '
                            'En cas de perte, merci de la remettre à la Daara Barakatul Mahaahidi.',
                            style: TextStyle(fontSize: 8, color: AppColors.textGrey),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Container(
                    width: 100,
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8), border: Border.all(color: _or.withValues(alpha: 0.3))),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        QrImageView(data: vCard, size: 78, backgroundColor: Colors.white),
                        const SizedBox(height: 4),
                        const Text('Scannez pour voir les infos du membre', textAlign: TextAlign.center, style: TextStyle(fontSize: 7, color: AppColors.textGrey)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          Container(height: 7, decoration: const BoxDecoration(gradient: LinearGradient(colors: [_or, _vert]))),
        ],
      ),
    );
  }

  Widget _ligne(String label, String valeur) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 1),
        child: RichText(
          text: TextSpan(
            style: const TextStyle(fontSize: 10, color: _noir),
            children: [
              TextSpan(text: '$label : ', style: const TextStyle(fontWeight: FontWeight.bold)),
              TextSpan(text: valeur),
            ],
          ),
        ),
      );
}
