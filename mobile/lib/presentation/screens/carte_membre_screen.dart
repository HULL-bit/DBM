import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:intl/intl.dart';
import 'package:open_file/open_file.dart';
import 'package:path_provider/path_provider.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../core/constants/api_endpoints.dart';
import '../../core/constants/colors.dart';
import '../../data/models/user_model.dart';

/// Carte de membre (badge) : identité, matricule, QR code — équivalent mobile de
/// CarteMembre.jsx côté web. Exportable en image (PNG) via le partage natif du téléphone.
class CarteMembreScreen extends StatefulWidget {
  final UserModel membre;
  const CarteMembreScreen({super.key, required this.membre});

  @override
  State<CarteMembreScreen> createState() => _CarteMembreScreenState();
}

class _CarteMembreScreenState extends State<CarteMembreScreen> {
  final GlobalKey _cardKey = GlobalKey();
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

  String _photoUrl(String? photo) {
    if (photo == null || photo.isEmpty) return '';
    return photo.startsWith('http') ? photo : '${ApiEndpoints.mediaBaseUrl}$photo';
  }

  Future<void> _exporter() async {
    setState(() => _exporting = true);
    try {
      final boundary = _cardKey.currentContext!.findRenderObject() as RenderRepaintBoundary;
      final image = await boundary.toImage(pixelRatio: 3);
      final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      final bytes = byteData!.buffer.asUint8List();
      final dir = await getTemporaryDirectory();
      final file = File('${dir.path}/carte_membre_${widget.membre.username}.png');
      await file.writeAsBytes(bytes as Uint8List);
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
    final m = widget.membre;
    final nomComplet = '${m.firstName ?? ''} ${m.lastName ?? ''}'.trim();
    final dateInscription = m.dateInscription != null ? DateFormat('MMMM yyyy', 'fr_FR').format(m.dateInscription!) : '';
    final dateNaissance = m.dateNaissance != null ? DateFormat('d MMMM yyyy', 'fr_FR').format(m.dateNaissance!) : '';
    final dateDelivrance = m.dateDelivranceCarte != null ? DateFormat('d MMMM yyyy', 'fr_FR').format(m.dateDelivranceCarte!) : '';
    final dateExpiration = m.dateExpirationCarte != null
        ? DateFormat('d MMMM yyyy', 'fr_FR').format(m.dateExpirationCarte!)
        : '31 décembre ${DateTime.now().year}';

    return Scaffold(
      appBar: AppBar(title: const Text('Carte de membre')),
      backgroundColor: AppColors.backgroundBeige,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            RepaintBoundary(
              key: _cardKey,
              child: Container(
                width: double.infinity,
                constraints: const BoxConstraints(maxWidth: 380),
                decoration: BoxDecoration(
                  color: const Color(0xFFFBF6EC),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: AppColors.primaryGold.withValues(alpha: 0.4)),
                  boxShadow: [BoxShadow(color: AppColors.primaryGreen.withValues(alpha: 0.18), blurRadius: 20, offset: const Offset(0, 8))],
                ),
                clipBehavior: Clip.antiAlias,
                child: Column(
                  children: [
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: const BoxDecoration(gradient: AppColors.primaryGradient),
                      child: const Row(
                        children: [
                          Icon(Icons.mosque, color: AppColors.white, size: 22),
                          SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Daara Barakatul Mahaahidi', style: TextStyle(color: AppColors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                                Text('CARTE DE MEMBRE', style: TextStyle(color: AppColors.primaryGold, fontSize: 10, letterSpacing: 1)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(10),
                            child: _photoUrl(m.photo).isNotEmpty
                                ? Image.network(
                                    _photoUrl(m.photo),
                                    width: 84,
                                    height: 84,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) => _initialsBox(nomComplet),
                                  )
                                : _initialsBox(nomComplet),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Nom : ${m.lastName?.isNotEmpty == true ? m.lastName : '—'}', style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.darkGreen, fontSize: 14)),
                                Text('Prénom : ${m.firstName?.isNotEmpty == true ? m.firstName : '—'}', style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.darkGreen, fontSize: 14)),
                                const SizedBox(height: 2),
                                Text(m.roleDisplay ?? m.role, style: const TextStyle(color: AppColors.primaryGreen, fontWeight: FontWeight.w600, fontSize: 12)),
                                Text('Matricule : $_identifiant', style: const TextStyle(color: AppColors.textGrey, fontSize: 11)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.primaryGold.withValues(alpha: 0.3))),
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
                    Container(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: Column(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.primaryGold.withValues(alpha: 0.3))),
                            child: QrImageView(data: _vCard, size: 110, backgroundColor: Colors.white),
                          ),
                          const SizedBox(height: 6),
                          const Text('Scannez pour voir les infos du membre', style: TextStyle(fontSize: 10, color: AppColors.textGrey)),
                        ],
                      ),
                    ),
                    Container(height: 6, decoration: const BoxDecoration(gradient: LinearGradient(colors: [AppColors.primaryGold, AppColors.primaryGreen]))),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),
            OutlinedButton.icon(
              onPressed: _exporting ? null : _exporter,
              icon: _exporting ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.ios_share),
              label: Text(_exporting ? 'Export en cours...' : 'Exporter / Partager la carte'),
              style: OutlinedButton.styleFrom(foregroundColor: AppColors.primaryGreen, side: const BorderSide(color: AppColors.primaryGreen)),
            ),
            const SizedBox(height: 8),
            const Text(
              'Cette carte est strictement personnelle et ne peut être cédée à un tiers.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 11, color: AppColors.textGrey, fontStyle: FontStyle.italic),
            ),
          ],
        ),
      ),
    );
  }

  Widget _initialsBox(String nom) {
    final initiales = nom.trim().isEmpty ? '?' : nom.trim().split(' ').where((s) => s.isNotEmpty).map((s) => s[0]).take(2).join().toUpperCase();
    return Container(
      width: 84,
      height: 84,
      color: AppColors.primaryGreen,
      alignment: Alignment.center,
      child: Text(initiales, style: const TextStyle(color: AppColors.white, fontSize: 24, fontWeight: FontWeight.bold)),
    );
  }

  Widget _ligne(String label, String valeur) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 1.5),
        child: RichText(
          text: TextSpan(
            style: const TextStyle(fontSize: 11, color: AppColors.textDark),
            children: [
              TextSpan(text: '$label : ', style: const TextStyle(fontWeight: FontWeight.bold)),
              TextSpan(text: valeur),
            ],
          ),
        ),
      );
}
