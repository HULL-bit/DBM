import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/constants/colors.dart';
import '../../core/constants/api_endpoints.dart';
import '../../data/services/api_service.dart';
import '../../data/providers/auth_provider.dart';
import 'package:provider/provider.dart';
import '../widgets/app_drawer.dart';

class EvenementsScreen extends StatefulWidget {
  const EvenementsScreen({super.key});

  @override
  State<EvenementsScreen> createState() => _EvenementsScreenState();
}

class _EvenementsScreenState extends State<EvenementsScreen> {
  final ApiService _api = ApiService();
  bool _loading = true;
  List<dynamic> _evenements = [];

  @override
  void initState() {
    super.initState();
    _loadEvents();
  }

  Future<void> _loadEvents() async {
    setState(() => _loading = true);
    try {
      final res = await _api.get(ApiEndpoints.evenements);
      final list = res['results'] ?? res['data'] ?? [];
      if (mounted) setState(() { _evenements = list is List ? list : []; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isManager = context.read<AuthProvider>().user?.isAdmin == true || context.read<AuthProvider>().user?.isJewrinOrganisation == true;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Événements'),
      ),
      drawer: const AppDrawer(),
      floatingActionButton: isManager ? FloatingActionButton(
        onPressed: () => _showEventForm(),
        backgroundColor: AppColors.primaryGold,
        child: const Icon(Icons.add, color: AppColors.white),
      ) : null,
      body: RefreshIndicator(
        onRefresh: _loadEvents,
        color: AppColors.primaryGreen,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _evenements.isEmpty
                ? const Center(child: Text('Aucun événement trouvé', style: TextStyle(color: AppColors.textGrey)))
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _evenements.length,
                    itemBuilder: (context, index) {
                      final evt = _evenements[index];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        child: ExpansionTile(
                          title: Text(evt['titre'] ?? 'Sans titre', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                          subtitle: Text(evt['date_debut']?.toString().split('T')[0] ?? ''),
                          leading: const Icon(Icons.event_note, color: AppColors.primaryGreen),
                          trailing: isManager ? Row(mainAxisSize: MainAxisSize.min, children: [
                            IconButton(icon: const Icon(Icons.edit, size: 18, color: AppColors.primaryGold), onPressed: () => _showEventForm(item: evt)),
                            IconButton(icon: const Icon(Icons.delete, size: 18, color: AppColors.error), onPressed: () => _confirmDelete(evt['id'])),
                          ]) : null,
                          children: [
                            Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                if (evt['lieu'] != null) Row(children: [const Icon(Icons.location_on, size: 14, color: AppColors.primaryGreen), const SizedBox(width: 8), Text(evt['lieu'])]),
                                const SizedBox(height: 8),
                                if (evt['description'] != null) Text(evt['description'], style: const TextStyle(fontSize: 13)),
                                if (evt['date_fin'] != null) ...[const SizedBox(height: 8), Text('Finit le: ${evt['date_fin'].toString().split('T')[0]}', style: const TextStyle(fontSize: 11, color: AppColors.textGrey))],
                              ]),
                            )
                          ],
                        ),
                      );
                    },
                  ),
      ),
    );
  }

  void _showEventForm({dynamic item}) {
    final titreCtrl = TextEditingController(text: item?['titre']);
    final descCtrl = TextEditingController(text: item?['description']);
    final lieuCtrl = TextEditingController(text: item?['lieu']);
    final adresseCtrl = TextEditingController(text: item?['adresse_complete']);
    final lienVisioCtrl = TextEditingController(text: item?['lien_visio']);
    String selectedType = item?['type_evenement'] ?? 'autre';
    DateTime? selectedDateDebut;
    DateTime? selectedDateFin;

    // Parse existing dates if editing
    if (item?['date_debut'] != null) {
      try {
        selectedDateDebut = DateTime.parse(item!['date_debut'].toString());
      } catch (_) {}
    }
    if (item?['date_fin'] != null) {
      try {
        selectedDateFin = DateTime.parse(item!['date_fin'].toString());
      } catch (_) {}
    }

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text(item == null ? 'Nouvel Événement' : 'Modifier Événement'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: titreCtrl,
                  decoration: const InputDecoration(labelText: 'Titre *'),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: descCtrl,
                  decoration: const InputDecoration(labelText: 'Description *'),
                  maxLines: 2,
                ),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  value: selectedType,
                  decoration: const InputDecoration(labelText: 'Type d\'événement *'),
                  items: const [
                    DropdownMenuItem(value: 'rencontre', child: Text('Rencontre')),
                    DropdownMenuItem(value: 'ceremonie', child: Text('Cérémonie')),
                    DropdownMenuItem(value: 'conference', child: Text('Conférence')),
                    DropdownMenuItem(value: 'ziara', child: Text('Ziara')),
                    DropdownMenuItem(value: 'formation', child: Text('Formation')),
                    DropdownMenuItem(value: 'assemblee', child: Text('Assemblée Générale')),
                    DropdownMenuItem(value: 'autre', child: Text('Autre')),
                  ],
                  onChanged: (v) => setDialogState(() => selectedType = v!),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: lieuCtrl,
                  decoration: const InputDecoration(labelText: 'Lieu *'),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: adresseCtrl,
                  decoration: const InputDecoration(labelText: 'Adresse complète'),
                  maxLines: 2,
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: lienVisioCtrl,
                  decoration: const InputDecoration(labelText: 'Lien visioconférence (optionnel)'),
                  keyboardType: TextInputType.url,
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () async {
                          final picked = await showDatePicker(
                            context: context,
                            initialDate: selectedDateDebut ?? DateTime.now(),
                            firstDate: DateTime.now(),
                            lastDate: DateTime.now().add(const Duration(days: 365)),
                          );
                          if (picked != null) {
                            final time = await showTimePicker(
                              context: context,
                              initialTime: TimeOfDay.fromDateTime(selectedDateDebut ?? DateTime.now()),
                            );
                            if (time != null) {
                              setDialogState(() {
                                selectedDateDebut = DateTime(
                                  picked.year,
                                  picked.month,
                                  picked.day,
                                  time.hour,
                                  time.minute,
                                );
                              });
                            }
                          }
                        },
                        icon: const Icon(Icons.calendar_today, size: 18),
                        label: Text(
                          selectedDateDebut != null
                              ? DateFormat('dd/MM/yyyy HH:mm').format(selectedDateDebut!)
                              : 'Date début *',
                          style: const TextStyle(fontSize: 11),
                        ),
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () async {
                          final picked = await showDatePicker(
                            context: context,
                            initialDate: selectedDateFin ?? DateTime.now().add(const Duration(days: 1)),
                            firstDate: selectedDateDebut ?? DateTime.now(),
                            lastDate: DateTime.now().add(const Duration(days: 365)),
                          );
                          if (picked != null) {
                            final time = await showTimePicker(
                              context: context,
                              initialTime: TimeOfDay.fromDateTime(selectedDateFin ?? DateTime.now()),
                            );
                            if (time != null) {
                              setDialogState(() {
                                selectedDateFin = DateTime(
                                  picked.year,
                                  picked.month,
                                  picked.day,
                                  time.hour,
                                  time.minute,
                                );
                              });
                            }
                          }
                        },
                        icon: const Icon(Icons.event_available, size: 18),
                        label: Text(
                          selectedDateFin != null
                              ? DateFormat('dd/MM/yyyy HH:mm').format(selectedDateFin!)
                              : 'Date fin *',
                          style: const TextStyle(fontSize: 11),
                        ),
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Annuler'),
            ),
            ElevatedButton(
              onPressed: () async {
                // Validation
                if (titreCtrl.text.trim().isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Le titre est requis'), backgroundColor: AppColors.error),
                  );
                  return;
                }
                if (descCtrl.text.trim().isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('La description est requise'), backgroundColor: AppColors.error),
                  );
                  return;
                }
                if (selectedDateDebut == null) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('La date de début est requise'), backgroundColor: AppColors.error),
                  );
                  return;
                }
                if (selectedDateFin == null) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('La date de fin est requise'), backgroundColor: AppColors.error),
                  );
                  return;
                }

                try {
                  final data = {
                    'titre': titreCtrl.text.trim(),
                    'description': descCtrl.text.trim(),
                    'type_evenement': selectedType,
                    'date_debut': selectedDateDebut!.toIso8601String(),
                    'date_fin': selectedDateFin!.toIso8601String(),
                    'lieu': lieuCtrl.text.trim(),
                    'adresse_complete': adresseCtrl.text.trim(),
                    'lien_visio': lienVisioCtrl.text.trim(),
                    'est_publie': true,
                  };
                  if (item == null) {
                    await _api.post(ApiEndpoints.evenements, data);
                  } else {
                    await _api.patch('${ApiEndpoints.evenements}${item['id']}/', data);
                  }
                  Navigator.pop(ctx);
                  _loadEvents();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Événement enregistré avec succès !'), backgroundColor: AppColors.success),
                  );
                } catch (e) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Erreur: $e'), backgroundColor: AppColors.error),
                  );
                }
              },
              child: const Text('Enregistrer'),
            ),
          ],
        ),
      ),
    );
  }

  void _confirmDelete(int id) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Supprimer événement'),
        content: const Text('Confirmer la suppression de cet événement ?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
          TextButton(
            onPressed: () async {
              try {
                await _api.delete('${ApiEndpoints.evenements}$id/');
                Navigator.pop(ctx);
                _loadEvents();
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
              }
            },
            child: const Text('Supprimer', style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );
  }
}
