import 'dart:io';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../../core/constants/api_endpoints.dart';
import '../../../core/constants/colors.dart';
import '../../../data/providers/auth_provider.dart';
import '../../../data/services/api_service.dart';
import '../../widgets/app_drawer.dart';
import '../../widgets/voice_message_player.dart';
import '../../widgets/voice_recorder_button.dart';
import 'majaaliss_screen.dart' show mediaUrl;

class LaajScreen extends StatefulWidget {
  const LaajScreen({super.key});

  @override
  State<LaajScreen> createState() => _LaajScreenState();
}

class _LaajScreenState extends State<LaajScreen> {
  final _api = ApiService();
  List<dynamic> _list = [];
  bool _loading = true;
  String _statutFilter = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await _api.get('${ApiEndpoints.laaj}?page_size=500');
      if (mounted) {
        setState(() {
          _list = data['results'] ?? data['data'] ?? [];
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<dynamic> get _filtered => _statutFilter.isEmpty ? _list : _list.where((l) => l['statut'] == _statutFilter).toList();

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final canManage = user != null && (user.isAdmin || user.isJewrinCulturelle);

    return Scaffold(
      appBar: AppBar(title: const Text('LAAJ')),
      drawer: const AppDrawer(),
      floatingActionButton: !canManage
          ? FloatingActionButton.extended(
              onPressed: () => _showAskDialog(context),
              backgroundColor: AppColors.primaryGreen,
              icon: const Icon(Icons.question_answer, color: AppColors.white),
              label: const Text('Poser une question', style: TextStyle(color: AppColors.white)),
            )
          : null,
      body: RefreshIndicator(
        onRefresh: _load,
        color: AppColors.primaryGreen,
        child: Column(
          children: [
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  ChoiceChip(label: const Text('Tous'), selected: _statutFilter.isEmpty, onSelected: (_) => setState(() => _statutFilter = '')),
                  const SizedBox(width: 8),
                  ChoiceChip(label: const Text('En attente'), selected: _statutFilter == 'en_attente', onSelected: (_) => setState(() => _statutFilter = 'en_attente')),
                  const SizedBox(width: 8),
                  ChoiceChip(label: const Text('Répondu'), selected: _statutFilter == 'repondu', onSelected: (_) => setState(() => _statutFilter = 'repondu')),
                ],
              ),
            ),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator(color: AppColors.primaryGreen))
                  : _filtered.isEmpty
                      ? const Center(child: Text('Aucune question', style: TextStyle(color: AppColors.textGrey)))
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _filtered.length,
                          itemBuilder: (context, i) {
                            final l = _filtered[i];
                            final repondu = l['statut'] == 'repondu';
                            final question = (l['question'] as String?) ?? '';
                            return Card(
                              margin: const EdgeInsets.only(bottom: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                              child: ListTile(
                                contentPadding: const EdgeInsets.all(14),
                                leading: CircleAvatar(
                                  backgroundColor: (repondu ? AppColors.success : AppColors.warning).withValues(alpha: 0.12),
                                  child: Icon(Icons.help_outline, color: repondu ? AppColors.success : AppColors.warning, size: 20),
                                ),
                                title: canManage && l['membre_nom'] != null
                                    ? Text(l['membre_nom'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.primaryGreen))
                                    : Text(
                                        question.isNotEmpty ? question : '🎤 Question vocale',
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                      ),
                                subtitle: canManage
                                    ? Text(question.isNotEmpty ? question : '🎤 Question vocale', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12))
                                    : null,
                                trailing: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(color: (repondu ? AppColors.success : AppColors.warning).withValues(alpha: 0.15), borderRadius: BorderRadius.circular(8)),
                                  child: Text(l['statut_display'] ?? (repondu ? 'Répondu' : 'En attente'),
                                      style: TextStyle(color: repondu ? AppColors.success : AppColors.warning, fontSize: 10, fontWeight: FontWeight.bold)),
                                ),
                                onTap: () => _showDetail(context, l, canManage),
                              ),
                            );
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }

  void _showAskDialog(BuildContext context) {
    final questionCtrl = TextEditingController();
    bool sending = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) {
          Future<void> envoyer({File? audio}) async {
            if (questionCtrl.text.trim().isEmpty && audio == null) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Écrivez votre question ou joignez un vocal.'), backgroundColor: AppColors.error),
              );
              return;
            }
            setDialogState(() => sending = true);
            try {
              final files = audio != null ? [await http.MultipartFile.fromPath('question_audio', audio.path)] : <http.MultipartFile>[];
              await _api.postMultipart(ApiEndpoints.laaj, fields: {'question': questionCtrl.text.trim()}, files: files);
              if (context.mounted) Navigator.pop(ctx);
              _load();
            } catch (e) {
              setDialogState(() => sending = false);
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e'), backgroundColor: AppColors.error));
              }
            }
          }

          return AlertDialog(
            title: const Text('Poser une question (LAAJ)'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: questionCtrl,
                  maxLines: 3,
                  decoration: const InputDecoration(labelText: 'Votre question (optionnel si vocal joint)'),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    const Text('Vocal :', style: TextStyle(fontSize: 12, color: AppColors.textGrey)),
                    const Spacer(),
                    sending ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)) : VoiceRecorderButton(onRecorded: (file, duree) => envoyer(audio: file)),
                  ],
                ),
              ],
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
              ElevatedButton(
                onPressed: sending ? null : () => envoyer(),
                child: sending ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: AppColors.white, strokeWidth: 2)) : const Text('Envoyer'),
              ),
            ],
          );
        },
      ),
    );
  }

  void _showDetail(BuildContext context, dynamic laaj, bool canManage) {
    final reponseCtrl = TextEditingController(text: laaj['reponse'] ?? '');
    bool sending = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) {
          Future<void> repondre({File? audio}) async {
            if (reponseCtrl.text.trim().isEmpty && audio == null) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Écrivez une réponse ou joignez un vocal.'), backgroundColor: AppColors.error),
              );
              return;
            }
            setDialogState(() => sending = true);
            try {
              final files = audio != null ? [await http.MultipartFile.fromPath('reponse_audio', audio.path)] : <http.MultipartFile>[];
              await _api.postMultipart('${ApiEndpoints.laaj}${laaj['id']}/repondre/', fields: {'reponse': reponseCtrl.text.trim()}, files: files);
              if (context.mounted) Navigator.pop(ctx);
              _load();
            } catch (e) {
              setDialogState(() => sending = false);
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e'), backgroundColor: AppColors.error));
              }
            }
          }

          final repondu = laaj['statut'] == 'repondu';
          final questionAudio = laaj['question_audio'] as String?;
          final reponseAudio = laaj['reponse_audio'] as String?;
          final dateQuestion = DateTime.tryParse(laaj['date_question'] ?? '');

          return AlertDialog(
            title: Row(
              children: [
                const Expanded(child: Text('LAAJ')),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: (repondu ? AppColors.success : AppColors.warning).withValues(alpha: 0.15), borderRadius: BorderRadius.circular(8)),
                  child: Text(laaj['statut_display'] ?? '', style: TextStyle(color: repondu ? AppColors.success : AppColors.warning, fontSize: 10, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (canManage && laaj['membre_nom'] != null)
                    Padding(padding: const EdgeInsets.only(bottom: 6), child: Text(laaj['membre_nom'], style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primaryGreen))),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(color: AppColors.primaryGreen.withValues(alpha: 0.05), borderRadius: BorderRadius.circular(10)),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if ((laaj['question'] as String?)?.isNotEmpty == true) Text(laaj['question']),
                        if (questionAudio != null && questionAudio.isNotEmpty) ...[
                          const SizedBox(height: 6),
                          VoiceMessagePlayer(url: mediaUrl(questionAudio)),
                        ],
                        if (dateQuestion != null) ...[
                          const SizedBox(height: 6),
                          Text(DateFormat('d MMM yyyy, HH:mm', 'fr_FR').format(dateQuestion), style: const TextStyle(fontSize: 11, color: AppColors.textGrey)),
                        ],
                      ],
                    ),
                  ),
                  if (repondu) ...[
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(color: AppColors.primaryGold.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Réponse — ${laaj['repondu_par_nom'] ?? ''}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.darkGreen)),
                          const SizedBox(height: 4),
                          if ((laaj['reponse'] as String?)?.isNotEmpty == true) Text(laaj['reponse']),
                          if (reponseAudio != null && reponseAudio.isNotEmpty) ...[
                            const SizedBox(height: 6),
                            VoiceMessagePlayer(url: mediaUrl(reponseAudio)),
                          ],
                        ],
                      ),
                    ),
                  ],
                  if (canManage) ...[
                    const SizedBox(height: 14),
                    TextField(
                      controller: reponseCtrl,
                      maxLines: 3,
                      decoration: InputDecoration(labelText: repondu ? 'Modifier la réponse (texte)' : 'Répondre par écrit (optionnel si vocal)'),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Text('Vocal :', style: TextStyle(fontSize: 12, color: AppColors.textGrey)),
                        const Spacer(),
                        sending ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)) : VoiceRecorderButton(onRecorded: (file, duree) => repondre(audio: file)),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            actions: [
              if (canManage)
                TextButton(
                  onPressed: sending ? null : () => repondre(),
                  child: const Text('Envoyer la réponse'),
                ),
              TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Fermer')),
            ],
          );
        },
      ),
    );
  }
}
