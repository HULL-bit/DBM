import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:intl/intl.dart';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../../core/constants/colors.dart';
import '../../core/constants/api_endpoints.dart';
import '../../data/services/api_service.dart';
import '../widgets/app_drawer.dart';
import 'package:provider/provider.dart';
import '../../data/providers/auth_provider.dart';
import '../widgets/stat_card.dart';

class ConservatoireScreen extends StatefulWidget {
  const ConservatoireScreen({super.key});

  @override
  State<ConservatoireScreen> createState() => _ConservatoireScreenState();
}

class _ConservatoireScreenState extends State<ConservatoireScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final ApiService _api = ApiService();
  String _statsSearch = '';
  String _seanceTypeFilter = '';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final isManager = user?.isJewrinConservatoire == true;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Conservatoire'),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          indicatorColor: AppColors.primaryGold,
          labelColor: AppColors.white,
          unselectedLabelColor: AppColors.white.withValues(alpha: 0.6),
          tabs: const [
            Tab(text: 'Documents'),
            Tab(text: 'Kourels'),
            Tab(text: 'Séances'),
            Tab(text: 'Statistiques'),
          ],
        ),
      ),
      drawer: const AppDrawer(),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildMediaList(ApiEndpoints.conservatoireDocuments, Icons.description, 'Aucun document'),
          _buildKourelList(),
          _buildSeanceList(),
          _buildStatsList(),
        ],
      ),
      floatingActionButton: isManager ? FloatingActionButton(
        onPressed: () => _showAddOptions(context),
        backgroundColor: AppColors.primaryGreen,
        child: const Icon(Icons.add, color: AppColors.white),
      ) : null,
    );
  }

  void _showAddOptions(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => Container(
        padding: const EdgeInsets.symmetric(vertical: 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.description, color: AppColors.primaryGreen),
              title: const Text('Nouveau Document'),
              onTap: () { Navigator.pop(context); _showDocumentForm(); },
            ),
            ListTile(
              leading: const Icon(Icons.group_add, color: AppColors.primaryGold),
              title: const Text('Nouveau Kourel'),
              onTap: () { Navigator.pop(context); _showKourelForm(); },
            ),
            ListTile(
              leading: const Icon(Icons.event_available, color: AppColors.info),
              title: const Text('Nouvelle Séance'),
              onTap: () { Navigator.pop(context); _showSeanceForm(); },
            ),
          ],
        ),
      ),
    );
  }

  void _showDocumentForm({dynamic item}) {
    final titleCtrl = TextEditingController(text: item?['titre']);
    final descCtrl = TextEditingController(text: item?['description']);
    final auteurCtrl = TextEditingController(text: item?['auteur']);
    String selectedType = item?['type_document'] ?? 'autre';
    File? selectedFile;
    bool isUploading = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text(item == null ? 'Nouveau Document' : 'Modifier Document'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(controller: titleCtrl, decoration: const InputDecoration(labelText: 'Titre *')),
                const SizedBox(height: 8),
                TextField(controller: auteurCtrl, decoration: const InputDecoration(labelText: 'Auteur *')),
                const SizedBox(height: 8),
                TextField(controller: descCtrl, decoration: const InputDecoration(labelText: 'Description'), maxLines: 2),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  value: selectedType,
                  decoration: const InputDecoration(labelText: 'Type de document'),
                  items: const [
                    DropdownMenuItem(value: 'livre', child: Text('Livre')),
                    DropdownMenuItem(value: 'article', child: Text('Article')),
                    DropdownMenuItem(value: 'these', child: Text('Th\u00e8se')),
                    DropdownMenuItem(value: 'memoire', child: Text('M\u00e9moire')),
                    DropdownMenuItem(value: 'rapport', child: Text('Rapport')),
                    DropdownMenuItem(value: 'guide', child: Text('Guide')),
                    DropdownMenuItem(value: 'autre', child: Text('Autre')),
                  ],
                  onChanged: (v) => setDialogState(() => selectedType = v!),
                ),
                const SizedBox(height: 12),
                if (item == null)
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      border: Border.all(color: AppColors.primaryGreen),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.picture_as_pdf, color: AppColors.primaryGreen),
                            const SizedBox(width: 8),
                            const Text('Fichier PDF *', style: TextStyle(fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const SizedBox(height: 8),
                        if (selectedFile != null)
                          Text('Fichier: ${selectedFile!.path.split('/').last}',
                              style: const TextStyle(fontSize: 12, color: AppColors.success))
                        else
                          const Text('Aucun fichier s\u00e9lectionn\u00e9', style: TextStyle(fontSize: 12, color: AppColors.textGrey)),
                        const SizedBox(height: 8),
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton.icon(
                            onPressed: isUploading
                                ? null
                                : () async {
                                    FilePickerResult? result = await FilePicker.platform.pickFiles(
                                      type: FileType.custom,
                                      allowedExtensions: ['pdf'],
                                    );
                                    if (result != null) {
                                      setDialogState(() {
                                        selectedFile = File(result.files.single.path!);
                                      });
                                    }
                                  },
                            icon: isUploading
                                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                                : const Icon(Icons.attach_file),
                            label: const Text('S\u00e9lectionner un PDF'),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
            ElevatedButton(
              onPressed: isUploading
                  ? null
                  : () async {
                      if (titleCtrl.text.trim().isEmpty || auteurCtrl.text.trim().isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Titre et auteur requis'), backgroundColor: AppColors.error),
                        );
                        return;
                      }
                      if (item == null && selectedFile == null) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Veuillez s\u00e9lectionner un fichier PDF'), backgroundColor: AppColors.error),
                        );
                        return;
                      }
                      setDialogState(() => isUploading = true);
                      try {
                        if (item == null && selectedFile != null) {
                          final request = http.MultipartRequest(
                            'POST',
                            Uri.parse('${ApiEndpoints.baseUrl}${ApiEndpoints.conservatoireDocuments}'),
                          );
                          final token = await _api.getAccessToken();
                          if (token != null) request.headers['Authorization'] = 'Bearer $token';
                          request.fields['titre'] = titleCtrl.text.trim();
                          request.fields['auteur'] = auteurCtrl.text.trim();
                          request.fields['description'] = descCtrl.text.trim();
                          request.fields['type_document'] = selectedType;
                          request.files.add(await http.MultipartFile.fromPath('fichier', selectedFile!.path));
                          final response = await request.send();
                          if (response.statusCode >= 200 && response.statusCode < 300) {
                            Navigator.pop(ctx);
                            setState(() {});
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Document ajout\u00e9 !'), backgroundColor: AppColors.success),
                            );
                          } else {
                            throw Exception('Erreur (${response.statusCode})');
                          }
                        } else {
                          final data = {
                            'titre': titleCtrl.text.trim(),
                            'auteur': auteurCtrl.text.trim(),
                            'description': descCtrl.text.trim(),
                            'type_document': selectedType,
                          };
                          await _api.patch('${ApiEndpoints.conservatoireDocuments}${item['id']}/', data);
                          Navigator.pop(ctx);
                          setState(() {});
                        }
                      } catch (e) {
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
                      } finally {
                        setDialogState(() => isUploading = false);
                      }
                    },
              child: isUploading
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: AppColors.white, strokeWidth: 2))
                  : const Text('Enregistrer'),
            ),
          ],
        ),
      ),
    );
  }

  void _showKourelForm({dynamic item}) {
    final nameCtrl = TextEditingController(text: item?['nom']);
    final descCtrl = TextEditingController(text: item?['description']);
    dynamic selectedMember = item?['maitre_de_coeur_details'];

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: Text(item == null ? 'Nouveau Kourel' : 'Modifier Kourel'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Nom du Kourel')),
                TextField(controller: descCtrl, decoration: const InputDecoration(labelText: 'Description'), maxLines: 2),
                const SizedBox(height: 12),
                ListTile(
                  dense: true,
                  title: Text(selectedMember?['nom'] ?? selectedMember?['fullName'] ?? 'Maître de Coeur'),
                  trailing: const Icon(Icons.person_search),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8), side: BorderSide(color: AppColors.textGrey.withValues(alpha: 0.3))),
                  onTap: () async {
                    final m = await _selectMember(context);
                    if (m != null) setState(() => selectedMember = m);
                  },
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
            ElevatedButton(
              onPressed: () async {
                try {
                  final data = {
                    'nom': nameCtrl.text,
                    'description': descCtrl.text,
                    if (selectedMember != null) 'maitre_de_coeur': selectedMember['id'],
                  };
                  if (item == null) { await _api.post(ApiEndpoints.kourels, data); }
                  else { await _api.patch('${ApiEndpoints.kourels}${item['id']}/', data); }
                  if (mounted) { Navigator.pop(ctx); this.setState(() {}); }
                } catch (e) { ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e'))); }
              },
              child: const Text('Enregistrer'),
            ),
          ],
        ),
      ),
    );
  }

  void _showSeanceForm({dynamic item}) {
    final titleCtrl = TextEditingController(text: item?['titre']);
    final descCtrl = TextEditingController(text: item?['description'] ?? '');
    final lieuCtrl = TextEditingController(text: item?['lieu'] ?? '');
    String selectedType = item?['type_seance'] ?? 'repetition';
    dynamic selectedKourel = item?['kourel'];
    DateTime? selectedDate;
    TimeOfDay? selectedTime;
    TimeOfDay? selectedEndTime;
    final List<Map<String, TextEditingController>> khassidas = ((item?['khassidas'] as List?) ?? [])
        .map<Map<String, TextEditingController>>((k) => {
              'nom_khassida': TextEditingController(text: k['nom_khassida'] ?? ''),
              'dathie': TextEditingController(text: k['dathie'] ?? ''),
              'khassida_portion': TextEditingController(text: k['khassida_portion'] ?? ''),
            })
        .toList();

    if (item?['date_heure'] != null) {
      final dt = DateTime.tryParse(item['date_heure'].toString());
      if (dt != null) {
        selectedDate = dt;
        selectedTime = TimeOfDay(hour: dt.hour, minute: dt.minute);
      }
    }
    if (item?['heure_fin'] != null) {
      final parts = item['heure_fin'].toString().split(':');
      if (parts.length >= 2) {
        selectedEndTime = TimeOfDay(hour: int.tryParse(parts[0]) ?? 18, minute: int.tryParse(parts[1]) ?? 0);
      }
    }

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text(item == null ? 'Nouvelle S\u00e9ance' : 'Modifier S\u00e9ance'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(controller: titleCtrl, decoration: const InputDecoration(labelText: 'Titre *')),
                const SizedBox(height: 8),
                TextField(controller: descCtrl, decoration: const InputDecoration(labelText: 'Description'), maxLines: 2),
                const SizedBox(height: 8),
                TextField(controller: lieuCtrl, decoration: const InputDecoration(labelText: 'Lieu')),
                const SizedBox(height: 12),
                // Date and start time
                ListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  title: Text(selectedDate != null && selectedTime != null
                      ? '${selectedDate!.day}/${selectedDate!.month}/${selectedDate!.year} \u00e0 ${selectedTime!.hour.toString().padLeft(2, '0')}:${selectedTime!.minute.toString().padLeft(2, '0')}'
                      : 'Date et heure de d\u00e9but *'),
                  trailing: const Icon(Icons.calendar_today, size: 18),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8), side: BorderSide(color: AppColors.textGrey.withValues(alpha: 0.3))),
                  onTap: () async {
                    final date = await showDatePicker(
                      context: context,
                      initialDate: selectedDate ?? DateTime.now(),
                      firstDate: DateTime(2020),
                      lastDate: DateTime(2030),
                    );
                    if (date != null) {
                      final time = await showTimePicker(
                        context: context,
                        initialTime: selectedTime ?? const TimeOfDay(hour: 18, minute: 0),
                      );
                      if (time != null) {
                        setDialogState(() {
                          selectedDate = date;
                          selectedTime = time;
                        });
                      }
                    }
                  },
                ),
                const SizedBox(height: 8),
                // End time
                ListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  title: Text(selectedEndTime != null
                      ? 'Fin: ${selectedEndTime!.hour.toString().padLeft(2, '0')}:${selectedEndTime!.minute.toString().padLeft(2, '0')}'
                      : 'Heure de fin (optionnel)'),
                  trailing: const Icon(Icons.access_time, size: 18),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8), side: BorderSide(color: AppColors.textGrey.withValues(alpha: 0.3))),
                  onTap: () async {
                    final time = await showTimePicker(
                      context: context,
                      initialTime: selectedEndTime ?? const TimeOfDay(hour: 20, minute: 0),
                    );
                    if (time != null) {
                      setDialogState(() => selectedEndTime = time);
                    }
                  },
                ),
                const SizedBox(height: 12),
                FutureBuilder<Map<String, dynamic>>(
                  future: _api.get(ApiEndpoints.kourels),
                  builder: (context, snapshot) {
                    final kourels = snapshot.data?['results'] ?? [];
                    return DropdownButtonFormField<int>(
                      value: selectedKourel is int ? selectedKourel : null,
                      decoration: const InputDecoration(labelText: 'Kourel *'),
                      items: (kourels as List).map((k) => DropdownMenuItem<int>(value: k['id'], child: Text(k['nom'] ?? 'Kourel'))).toList(),
                      onChanged: (v) => setDialogState(() => selectedKourel = v),
                    );
                  },
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: selectedType,
                  decoration: const InputDecoration(labelText: 'Type de s\u00e9ance'),
                  items: const [
                    DropdownMenuItem(value: 'repetition', child: Text('R\u00e9p\u00e9tition')),
                    DropdownMenuItem(value: 'prestation', child: Text('Prestation')),
                  ],
                  onChanged: (v) => setDialogState(() => selectedType = v!),
                ),
                const SizedBox(height: 16),
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text('Programme de répétition (khassidas)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.primaryGreen)),
                ),
                const SizedBox(height: 8),
                ...khassidas.asMap().entries.map((entry) {
                  final i = entry.key;
                  final k = entry.value;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            children: [
                              TextField(controller: k['nom_khassida'], decoration: const InputDecoration(labelText: 'Khassida', isDense: true)),
                              const SizedBox(height: 6),
                              TextField(controller: k['dathie'], decoration: const InputDecoration(labelText: 'Dathie (auteur)', isDense: true)),
                              const SizedBox(height: 6),
                              TextField(controller: k['khassida_portion'], decoration: const InputDecoration(labelText: 'Portion (optionnel)', isDense: true)),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.delete_outline, color: AppColors.error, size: 20),
                          onPressed: () => setDialogState(() => khassidas.removeAt(i)),
                        ),
                      ],
                    ),
                  );
                }),
                TextButton.icon(
                  onPressed: () => setDialogState(() => khassidas.add({
                        'nom_khassida': TextEditingController(),
                        'dathie': TextEditingController(),
                        'khassida_portion': TextEditingController(),
                      })),
                  icon: const Icon(Icons.add, size: 18, color: AppColors.primaryGreen),
                  label: const Text('Ajouter une khassida', style: TextStyle(color: AppColors.primaryGreen)),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
            ElevatedButton(
              onPressed: () async {
                if (titleCtrl.text.trim().isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Le titre est requis'), backgroundColor: AppColors.error),
                  );
                  return;
                }
                if (selectedDate == null || selectedTime == null) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('La date et heure sont requises'), backgroundColor: AppColors.error),
                  );
                  return;
                }
                if (selectedKourel == null && item == null) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Veuillez s\u00e9lectionner un kourel'), backgroundColor: AppColors.error),
                  );
                  return;
                }
                try {
                  final dateHeure = DateTime(
                    selectedDate!.year, selectedDate!.month, selectedDate!.day,
                    selectedTime!.hour, selectedTime!.minute,
                  );
                  final data = <String, dynamic>{
                    'titre': titleCtrl.text.trim(),
                    'description': descCtrl.text.trim(),
                    'lieu': lieuCtrl.text.trim(),
                    'date_heure': dateHeure.toIso8601String(),
                    'kourel': selectedKourel ?? item?['kourel'],
                    'type_seance': selectedType,
                  };
                  if (selectedEndTime != null) {
                    data['heure_fin'] = '${selectedEndTime!.hour.toString().padLeft(2, '0')}:${selectedEndTime!.minute.toString().padLeft(2, '0')}:00';
                  }
                  int seanceId;
                  if (item == null) {
                    final created = await _api.post(ApiEndpoints.seancesConservatoire, data);
                    seanceId = created['id'] as int;
                  } else {
                    seanceId = item['id'] as int;
                    await _api.patch('${ApiEndpoints.seancesConservatoire}$seanceId/', data);
                  }
                  final khassidasPayload = khassidas
                      .where((k) => k['nom_khassida']!.text.trim().isNotEmpty)
                      .map((k) => {
                            'nom_khassida': k['nom_khassida']!.text.trim(),
                            'dathie': k['dathie']!.text.trim(),
                            'khassida_portion': k['khassida_portion']!.text.trim(),
                          })
                      .toList();
                  await _api.post('${ApiEndpoints.seancesConservatoire}$seanceId/khassidas/', {'khassidas': khassidasPayload});
                  if (mounted) { Navigator.pop(ctx); this.setState(() {}); }
                } catch (e) { ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e'))); }
              },
              child: const Text('Enregistrer'),
            ),
          ],
        ),
      ),
    );
  }

  void _showKourelMembersDialog(dynamic kourel) {
    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) {
          Future<Map<String, dynamic>> fetchKourel() =>
              _api.get('${ApiEndpoints.kourels}${kourel['id']}/');

          return AlertDialog(
            title: Text('Membres - ${kourel['nom']}'),
            content: Container(
              width: double.maxFinite,
              constraints: const BoxConstraints(maxHeight: 420),
              child: FutureBuilder<Map<String, dynamic>>(
                future: fetchKourel(),
                builder: (context, snapshot) {
                  if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
                  final data = snapshot.data!;
                  // membres_noms est déjà la liste exploitable : [{id, nom, photo}, ...].
                  // membres (bruts, juste des IDs) sert uniquement à reconstruire la liste
                  // à envoyer au PATCH — jamais à l'affichage.
                  final members = ((data['membres_noms'] as List?) ?? [])
                      .map((e) => e as Map<String, dynamic>)
                      .toList();
                  final memberIds = members.map((m) => m['id'] as int).toList();

                  return Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      ElevatedButton.icon(
                        onPressed: () async {
                          final m = await _selectMember(context);
                          if (m != null) {
                            try {
                              if (!memberIds.contains(m['id'] as int)) {
                                final newIds = [...memberIds, m['id'] as int];
                                await _api.patch('${ApiEndpoints.kourels}${kourel['id']}/', {'membres': newIds});
                                setDialogState(() {});
                                setState(() {});
                              }
                            } catch (e) {
                              if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
                            }
                          }
                        },
                        icon: const Icon(Icons.person_add, size: 18),
                        label: const Text('Ajouter un membre'),
                        style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryGreen, foregroundColor: AppColors.white),
                      ),
                      const SizedBox(height: 8),
                      if (members.isEmpty)
                        const Padding(
                          padding: EdgeInsets.all(16),
                          child: Text('Aucun membre dans ce kourel', style: TextStyle(color: AppColors.textGrey)),
                        )
                      else
                        Expanded(
                          child: ListView.builder(
                            shrinkWrap: true,
                            itemCount: members.length,
                            itemBuilder: (c, i) {
                              final m = members[i];
                              return ListTile(
                                dense: true,
                                leading: CircleAvatar(
                                  radius: 16,
                                  backgroundColor: AppColors.primaryGreen.withValues(alpha: 0.1),
                                  child: Text((m['nom'] as String)[0].toUpperCase(), style: const TextStyle(fontSize: 12, color: AppColors.primaryGreen, fontWeight: FontWeight.bold)),
                                ),
                                title: Text(m['nom'] as String, style: const TextStyle(fontSize: 14)),
                                trailing: IconButton(
                                  icon: const Icon(Icons.remove_circle, color: AppColors.error, size: 20),
                                  tooltip: 'Retirer du kourel',
                                  onPressed: () async {
                                    final confirm = await showDialog<bool>(
                                      context: context,
                                      builder: (c) => AlertDialog(
                                        title: const Text('Retirer ce membre ?'),
                                        content: Text('Retirer ${m['nom']} de ce kourel ?'),
                                        actions: [
                                          TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Annuler')),
                                          ElevatedButton(
                                            onPressed: () => Navigator.pop(c, true),
                                            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
                                            child: const Text('Retirer'),
                                          ),
                                        ],
                                      ),
                                    );
                                    if (confirm == true) {
                                      try {
                                        final newIds = memberIds.where((id) => id != m['id'] as int).toList();
                                        await _api.patch('${ApiEndpoints.kourels}${kourel['id']}/', {'membres': newIds});
                                        setDialogState(() {});
                                        setState(() {});
                                      } catch (e) {
                                        if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
                                      }
                                    }
                                  },
                                ),
                              );
                            },
                          ),
                        ),
                    ],
                  );
                },
              ),
            ),
            actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Fermer'))],
          );
        },
      ),
    );
  }

  Future<dynamic> _selectMember(BuildContext context) async {
    return showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Sélectionner un membre'),
        content: Container(
          width: double.maxFinite,
          constraints: const BoxConstraints(maxHeight: 400),
          child: FutureBuilder(
            future: _api.get(ApiEndpoints.users),
            builder: (c, snapshot) {
              if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
              final members = (snapshot.data as Map<String, dynamic>)['results'] ?? [];
              return ListView.builder(
                shrinkWrap: true,
                itemCount: members.length,
                itemBuilder: (cc, i) {
                  final m = members[i];
                  final name = (m['first_name'] != null || m['last_name'] != null)
                      ? '${m['first_name'] ?? ''} ${m['last_name'] ?? ''}'.trim()
                      : (m['nom'] ?? m['username'] ?? '');
                  return ListTile(
                    dense: true,
                    leading: CircleAvatar(radius: 16, backgroundColor: AppColors.primaryGreen.withValues(alpha: 0.1),
                        child: Text(name.isNotEmpty ? name[0].toUpperCase() : '?', style: const TextStyle(fontSize: 12, color: AppColors.primaryGreen))),
                    title: Text(name),
                    subtitle: Text(m['email'] ?? '', style: const TextStyle(fontSize: 11)),
                    onTap: () => Navigator.pop(ctx, m),
                  );
                },
              );
            },
          ),
        ),
      ),
    );
  }

  void _confirmDelete(String endpoint, int id) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirmer la suppression'),
        content: const Text('Voulez-vous vraiment supprimer cet élément ?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
          TextButton(
            onPressed: () async {
              try {
                await _api.delete('$endpoint$id/');
                if (mounted) { Navigator.pop(ctx); setState(() {}); }
              } catch (e) { ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e'))); }
            },
            child: const Text('Supprimer', style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );
  }

  Widget _buildMediaList(String endpoint, IconData icon, String emptyMsg) {
    return FutureBuilder<Map<String, dynamic>>(
      future: _api.get(endpoint),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
        final list = snapshot.data?['results'] ?? snapshot.data?['data'] ?? [];
        if (list.isEmpty) return Center(child: Text(emptyMsg, style: const TextStyle(color: AppColors.textGrey)));

        return ListView.builder(
          padding: const EdgeInsets.all(12),
          itemCount: list.length,
          itemBuilder: (ctx, i) {
            final item = list[i];
            final isManager = context.read<AuthProvider>().user?.isJewrinConservatoire == true;
            return Card(
              margin: const EdgeInsets.only(bottom: 10),
              child: ListTile(
                leading: CircleAvatar(backgroundColor: AppColors.primaryGreen.withValues(alpha: 0.1), child: Icon(icon, color: AppColors.primaryGreen, size: 20)),
                title: Text(item['titre'] ?? 'Sans titre', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                subtitle: Text(item['description'] ?? item['auteur'] ?? '', maxLines: 1, overflow: TextOverflow.ellipsis),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (isManager) ...[
                      IconButton(icon: const Icon(Icons.edit, size: 18, color: AppColors.primaryGold), onPressed: () => _showDocumentForm(item: item)),
                      IconButton(icon: const Icon(Icons.delete, size: 18, color: AppColors.error), onPressed: () => _confirmDelete(endpoint, item['id'])),
                    ],
                    const Icon(Icons.download_outlined, size: 20, color: AppColors.primaryGold),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildKourelList() {
    return FutureBuilder<Map<String, dynamic>>(
      future: _api.get(ApiEndpoints.kourels),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
        final list = snapshot.data?['results'] ?? snapshot.data?['data'] ?? [];
        if (list.isEmpty) return const Center(child: Text('Aucun Kourel trouvé'));

        return ListView.builder(
          padding: const EdgeInsets.all(12),
          itemCount: list.length,
          itemBuilder: (ctx, i) {
            final item = list[i];
            return Card(
              margin: const EdgeInsets.only(bottom: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(item['nom'] ?? 'Kourel', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.primaryGreen)),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(color: AppColors.primaryGold.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
                          child: Text('${item['nb_membres'] ?? 0} membres', style: const TextStyle(color: AppColors.primaryGold, fontSize: 11, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    if (item['maitre_de_coeur_nom'] != null)
                      Row(children: [
                        const Icon(Icons.person, size: 14, color: AppColors.textGrey),
                        const SizedBox(width: 6),
                        Text('Maître de coeur: ${item['maitre_de_coeur_nom']}', style: const TextStyle(fontSize: 12, color: AppColors.textGrey)),
                      ]),
                    if (item['description'] != null && item['description'].isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text(item['description'], style: const TextStyle(fontSize: 13), maxLines: 2, overflow: TextOverflow.ellipsis),
                    ],
                    if (context.read<AuthProvider>().user?.isJewrinConservatoire == true) ...[
                      const Divider(),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          TextButton.icon(onPressed: () => _showKourelMembersDialog(item), icon: const Icon(Icons.people_outline, size: 16), label: const Text('Membres')),
                          TextButton.icon(onPressed: () => _showKourelForm(item: item), icon: const Icon(Icons.edit, size: 16, color: AppColors.primaryGold), label: const Text('Modifier', style: TextStyle(color: AppColors.primaryGold))),
                          TextButton.icon(onPressed: () => _confirmDelete(ApiEndpoints.kourels, item['id']), icon: const Icon(Icons.delete, size: 16, color: AppColors.error), label: const Text('Supprimer', style: TextStyle(color: AppColors.error))),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildSeanceList() {
    return StatefulBuilder(
      builder: (context, setLocalState) {
        final query = _seanceTypeFilter.isEmpty
            ? '?page_size=50'
            : '?type_seance=$_seanceTypeFilter&page_size=50';
        return Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
              child: Row(
                children: [
                  ChoiceChip(
                    label: const Text('Toutes'),
                    selected: _seanceTypeFilter.isEmpty,
                    onSelected: (_) => setState(() => _seanceTypeFilter = ''),
                  ),
                  const SizedBox(width: 8),
                  ChoiceChip(
                    label: const Text('Répétitions'),
                    selected: _seanceTypeFilter == 'repetition',
                    onSelected: (_) => setState(() => _seanceTypeFilter = 'repetition'),
                  ),
                  const SizedBox(width: 8),
                  ChoiceChip(
                    label: const Text('Prestations'),
                    selected: _seanceTypeFilter == 'prestation',
                    onSelected: (_) => setState(() => _seanceTypeFilter = 'prestation'),
                  ),
                ],
              ),
            ),
            Expanded(
              child: FutureBuilder<Map<String, dynamic>>(
                key: ValueKey(_seanceTypeFilter),
                future: _api.get('${ApiEndpoints.seancesConservatoire}$query'),
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
                  final list = snapshot.data?['results'] ?? snapshot.data?['data'] ?? [];
                  if (list.isEmpty) return const Center(child: Text('Aucune séance trouvée'));

                  return ListView.builder(
                    padding: const EdgeInsets.all(12),
                    itemCount: list.length,
                    itemBuilder: (ctx, i) {
            final item = list[i];
            final isRepet = item['type_seance'] == 'repetition';
            
            return Card(
              margin: const EdgeInsets.only(bottom: 12),
              child: ExpansionTile(
                leading: Icon(isRepet ? Icons.replay : Icons.star, color: isRepet ? AppColors.info : AppColors.success),
                title: Text(item['titre'] ?? 'Séance', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                subtitle: Text('${item['kourel_nom']} • ${item['date_heure']?.split('T')[0]}', style: const TextStyle(fontSize: 12)),
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Divider(),
                        if (item['khassidas'] != null && (item['khassidas'] as List).isNotEmpty) ...[
                          const Text('Khassidas travaillées:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.primaryGreen)),
                          const SizedBox(height: 4),
                          ...(item['khassidas'] as List).map((k) => Padding(
                            padding: const EdgeInsets.only(bottom: 4),
                            child: Row(children: [
                              const Icon(Icons.music_note, size: 14, color: AppColors.primaryGold),
                              const SizedBox(width: 8),
                              Expanded(child: Text('${k['nom_khassida']} (${k['dathie']})', style: const TextStyle(fontSize: 12))),
                            ]),
                          )),
                        ],
                        const SizedBox(height: 10),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            TextButton.icon(
                              onPressed: () => _showPresences(item),
                              icon: const Icon(Icons.people_alt_outlined, size: 18),
                              label: const Text('Voir présences'),
                            ),
                            if (context.read<AuthProvider>().user?.isJewrinConservatoire == true)
                              Row(children: [
                                IconButton(onPressed: () => _showSeanceForm(item: item), icon: const Icon(Icons.edit, size: 18, color: AppColors.primaryGold)),
                                IconButton(onPressed: () => _confirmDelete(ApiEndpoints.seancesConservatoire, item['id']), icon: const Icon(Icons.delete, size: 18, color: AppColors.error)),
                              ]),
                          ],
                        )
                      ],
                    ),
                  )
                ],
              ),
            );
                    },
                  );
                },
              ),
            ),
          ],
        );
      },
    );
  }

  Future<Map<String, dynamic>> _getConservatoireStats() async {
    final kourelData = await _api.get('${ApiEndpoints.kourels}?page_size=1000');
    final seanceData = await _api.get('${ApiEndpoints.seancesConservatoire}?page_size=1000');
    final allKourels = (kourelData['results'] ?? kourelData['data'] ?? (kourelData is List ? kourelData : [])) as List;
    final allSeances = (seanceData['results'] ?? seanceData['data'] ?? (seanceData is List ? seanceData : [])) as List;
    final repetitions = allSeances.where((s) => s['type_seance'] == 'repetition').length;
    final prestations = allSeances.where((s) => s['type_seance'] == 'prestation').length;
    // Count total members across all kourels (deduplicated)
    final allMemberIds = <int>{};
    for (final k in allKourels) {
      final mIds = k['membres'] as List? ?? [];
      for (final id in mIds) { allMemberIds.add(id as int); }
    }
    return {
      'total_kourels': allKourels.length,
      'total_seances': allSeances.length,
      'total_repetitions': repetitions,
      'total_prestations': prestations,
      'total_membres': allMemberIds.length,
    };
  }

  Widget _buildStatsList() {
    return Column(
      children: [
        FutureBuilder<Map<String, dynamic>>(
          future: _getConservatoireStats(),
          builder: (context, snapshot) {
            final stats = snapshot.data;
            final loading = snapshot.connectionState == ConnectionState.waiting;
            return SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
              child: Row(
                children: [
                  SizedBox(
                    width: 140,
                    child: StatCard(
                      title: 'Kourels',
                      value: loading ? '...' : '${stats?['total_kourels'] ?? 0}',
                      icon: Icons.groups_outlined,
                      color: AppColors.primaryGreen,
                    ),
                  ),
                  const SizedBox(width: 8),
                  SizedBox(
                    width: 140,
                    child: StatCard(
                      title: 'Séances',
                      value: loading ? '...' : '${stats?['total_seances'] ?? 0}',
                      icon: Icons.event_available,
                      color: AppColors.info,
                    ),
                  ),
                  const SizedBox(width: 8),
                  SizedBox(
                    width: 140,
                    child: StatCard(
                      title: 'Répétitions',
                      value: loading ? '...' : '${stats?['total_repetitions'] ?? 0}',
                      icon: Icons.replay,
                      color: AppColors.primaryGold,
                    ),
                  ),
                  const SizedBox(width: 8),
                  SizedBox(
                    width: 140,
                    child: StatCard(
                      title: 'Prestations',
                      value: loading ? '...' : '${stats?["total_prestations"] ?? 0}',
                      icon: Icons.star,
                      color: AppColors.success,
                    ),
                  ),
                  const SizedBox(width: 8),
                  SizedBox(
                    width: 140,
                    child: StatCard(
                      title: 'Membres actifs',
                      value: loading ? '...' : '${stats?["total_membres"] ?? 0}',
                      icon: Icons.people,
                      color: Colors.deepPurple,
                    ),
                  ),
                ],
              ),
            );
          },
        ),
        Padding(
          padding: const EdgeInsets.all(12),
          child: TextField(
            onChanged: (v) => setState(() => _statsSearch = v),
            decoration: InputDecoration(
              hintText: 'Rechercher un membre...',
              prefixIcon: const Icon(Icons.search),
              filled: true,
              fillColor: AppColors.white,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              contentPadding: const EdgeInsets.symmetric(vertical: 0),
            ),
          ),
        ),
        Expanded(
          child: FutureBuilder<dynamic>(
            future: _api.get(ApiEndpoints.presencesStats),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
              final data = snapshot.data;
              List list = data is List
                  ? data
                  : (data is Map ? (data['results'] ?? data['data'] ?? []) : []);

              if (_statsSearch.isNotEmpty) {
                list = list.where((m) => (m['membre_nom'] ?? '').toString().toLowerCase().contains(_statsSearch.toLowerCase())).toList();
              }

              if (list.isEmpty) return const Center(child: Text('Aucun membre correspondant'));

              return ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                itemCount: list.length,
                itemBuilder: (ctx, i) {
                  final item = list[i];
                  final pct = (item['pourcentage'] ?? 0).toDouble();
                  final color = pct >= 80 ? AppColors.success : pct >= 50 ? AppColors.warning : Colors.red;

                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: InkWell(
                      onTap: () => _showMemberPresenceDetails(item),
                      borderRadius: BorderRadius.circular(12),
                      child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(child: Text(item['membre_nom'] ?? 'Membre', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14))),
                              Text('${pct.toStringAsFixed(1)}%', style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 16)),
                            ],
                          ),
                          const SizedBox(height: 12),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(5),
                            child: LinearProgressIndicator(value: pct / 100, backgroundColor: color.withValues(alpha: 0.1), valueColor: AlwaysStoppedAnimation<Color>(color), minHeight: 10),
                          ),
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('Présences: ${item['nb_presents']}', style: const TextStyle(fontSize: 12, color: AppColors.textGrey)),
                              Text('Total: ${item['nb_total']}', style: const TextStyle(fontSize: 12, color: AppColors.textGrey)),
                            ],
                          ),
                          const SizedBox(height: 4),
                          const Align(
                            alignment: Alignment.centerRight,
                            child: Text('Voir le détail →', style: TextStyle(fontSize: 11, color: AppColors.primaryGreen, fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                    ),
                    ),
                  );
                },
              );
            },
          ),
        ),
      ],
    );
  }

  void _showMemberPresenceDetails(dynamic memberStat) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.7,
        builder: (ctx, scrollController) => FutureBuilder<Map<String, dynamic>>(
          future: _api.get('${ApiEndpoints.presences}?membre=${memberStat['membre_id']}&page_size=200'),
          builder: (context, snapshot) {
            final list = snapshot.data?['results'] ?? snapshot.data?['data'] ?? [];
            return Column(
              children: [
                const SizedBox(height: 12),
                Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2))),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(
                    'Présences — ${memberStat['membre_nom']}',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                ),
                Expanded(
                  child: snapshot.connectionState == ConnectionState.waiting
                      ? const Center(child: CircularProgressIndicator(color: AppColors.primaryGreen))
                      : (list as List).isEmpty
                          ? const Center(child: Text('Aucune présence enregistrée', style: TextStyle(color: AppColors.textGrey)))
                          : ListView.separated(
                              controller: scrollController,
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              itemCount: list.length,
                              separatorBuilder: (_, __) => const Divider(height: 1),
                              itemBuilder: (_, i) {
                                final p = list[i];
                                final present = p['statut'] == 'present';
                                final date = DateTime.tryParse(p['seance_date'] ?? '');
                                return ListTile(
                                  leading: Icon(present ? Icons.check_circle : Icons.cancel, color: present ? AppColors.success : AppColors.error),
                                  title: Text(p['seance_titre'] ?? 'Séance', style: const TextStyle(fontSize: 14)),
                                  subtitle: date != null ? Text(DateFormat('d MMM yyyy', 'fr_FR').format(date), style: const TextStyle(fontSize: 12)) : null,
                                  trailing: Text(p['statut_display'] ?? '', style: TextStyle(fontSize: 11, color: present ? AppColors.success : AppColors.error, fontWeight: FontWeight.bold)),
                                );
                              },
                            ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  void _showPresences(dynamic seance) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.8,
        maxChildSize: 0.95,
        builder: (ctx, ctrl) => StatefulBuilder(
          builder: (context, setDialogState) => FutureBuilder<Map<String, dynamic>>(
            future: () async {
              // Fetch seance with presences
              final seanceData = await _api.get('${ApiEndpoints.seancesConservatoire}${seance['id']}/');
              // membres_noms est déjà la liste exploitable du kourel : [{id, nom, photo}, ...].
              // Passer par /auth/users/ pour filtrer soi-même tronquait la liste dès que
              // le nombre de membres dépassait la pagination par défaut (20).
              final kourelData = await _api.get('${ApiEndpoints.kourels}${seanceData['kourel']}/');
              final kourelMembers = ((kourelData['membres_noms'] as List?) ?? [])
                  .map((e) => e as Map<String, dynamic>)
                  .toList();

              return {
                'seance': seanceData,
                'members': kourelMembers,
              };
            }(),
            builder: (context, snapshot) {
              if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
              
              final data = snapshot.data! as Map<String, dynamic>;
              final currentSeance = data['seance'] as Map<String, dynamic>;
              final allMembers = data['members'] as List<dynamic>;
              final existingPresences = currentSeance['presences'] as List? ?? [];

              return Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(child: Text('Feuille de présence - ${currentSeance['titre']}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16))),
                        IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(ctx)),
                      ],
                    ),
                  ),
                  const Divider(height: 1),
                  Expanded(
                    child: ListView.builder(
                      controller: ctrl,
                      itemCount: allMembers.length,
                      itemBuilder: (c, i) {
                        final member = allMembers[i];
                        final p = existingPresences.firstWhere(
                          (x) => x['membre'] == member['id'] || x['membre_id'] == member['id'], 
                          orElse: () => null,
                        );
                        
                        final statut = p?['statut'] ?? 'non marque';
                        final isPresent = statut == 'present';
                        final isAbsentJustifie = statut == 'absent_justifie';
                        final isAbsentNonJustifie = statut == 'absent_non_justifie';
                        final hasPresence = p != null;

                        return ListTile(
                          dense: true,
                          leading: CircleAvatar(
                            backgroundColor: !hasPresence 
                                ? AppColors.textGrey.withValues(alpha: 0.1) 
                                : (isPresent 
                                    ? AppColors.success.withValues(alpha: 0.1) 
                                    : Colors.red.withValues(alpha: 0.1)),
                            child: Icon(
                              !hasPresence 
                                  ? Icons.person_outline 
                                  : (isPresent ? Icons.check : Icons.close),
                              color: !hasPresence 
                                  ? AppColors.textGrey 
                                  : (isPresent ? AppColors.success : Colors.red),
                              size: 16,
                            ),
                          ),
                          title: Text(
                            (member['nom'] ?? '').toString(),
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                          ),
                          subtitle: Text(
                            isPresent 
                                ? 'Présent' 
                                : (isAbsentJustifie 
                                    ? 'Absent justifié' 
                                    : (isAbsentNonJustifie ? 'Absent non justifié' : 'Non marqué')),
                            style: TextStyle(
                              fontSize: 11, 
                              color: isPresent 
                                  ? AppColors.success 
                                  : (isAbsentJustifie 
                                      ? AppColors.info 
                                      : (isAbsentNonJustifie ? Colors.red : AppColors.textGrey)),
                            ),
                          ),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              // Bouton Présent
                              IconButton(
                                icon: Icon(
                                  Icons.check_circle, 
                                  color: isPresent ? AppColors.success : AppColors.textGrey.withValues(alpha: 0.3),
                                ),
                                onPressed: () async {
                                  try {
                                    final data = {
                                      'seance': currentSeance['id'],
                                      'membre': member['id'],
                                      'statut': 'present',
                                    };
                                    if (hasPresence) {
                                      await _api.patch('${ApiEndpoints.presences}${p['id']}/', data);
                                    } else {
                                      await _api.post(ApiEndpoints.presences, data);
                                    }
                                    // Refresh the seance data
                                    await _api.get('${ApiEndpoints.seancesConservatoire}${currentSeance['id']}/');
                                    setDialogState(() {});
                                  } catch (e) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(content: Text('Erreur: $e')),
                                    );
                                  }
                                },
                              ),
                              // Bouton Absent Justifié
                              IconButton(
                                icon: Icon(
                                  Icons.assignment_turned_in, 
                                  color: isAbsentJustifie ? AppColors.info : AppColors.textGrey.withValues(alpha: 0.3),
                                ),
                                onPressed: () async {
                                  try {
                                    final data = {
                                      'seance': currentSeance['id'],
                                      'membre': member['id'],
                                      'statut': 'absent_justifie',
                                    };
                                    if (hasPresence) {
                                      await _api.patch('${ApiEndpoints.presences}${p['id']}/', data);
                                    } else {
                                      await _api.post(ApiEndpoints.presences, data);
                                    }
                                    setDialogState(() {});
                                  } catch (e) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(content: Text('Erreur: $e')),
                                    );
                                  }
                                },
                              ),
                              // Bouton Absent Non Justifié
                              IconButton(
                                icon: Icon(
                                  Icons.cancel, 
                                  color: isAbsentNonJustifie ? Colors.red : AppColors.textGrey.withValues(alpha: 0.3),
                                ),
                                onPressed: () async {
                                  try {
                                    final data = {
                                      'seance': currentSeance['id'],
                                      'membre': member['id'],
                                      'statut': 'absent_non_justifie',
                                    };
                                    if (hasPresence) {
                                      await _api.patch('${ApiEndpoints.presences}${p['id']}/', data);
                                    } else {
                                      await _api.post(ApiEndpoints.presences, data);
                                    }
                                    setDialogState(() {});
                                  } catch (e) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(content: Text('Erreur: $e')),
                                    );
                                  }
                                },
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}
