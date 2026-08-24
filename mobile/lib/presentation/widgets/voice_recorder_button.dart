import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:record/record.dart';

import '../../core/constants/colors.dart';

/// Bouton micro : appui = démarre l'enregistrement, ré-appui = arrête et
/// renvoie le fichier + sa durée via [onRecorded]. Un appui sur la croix
/// pendant l'enregistrement annule sans envoyer.
class VoiceRecorderButton extends StatefulWidget {
  final void Function(File file, int dureeSecondes) onRecorded;

  const VoiceRecorderButton({super.key, required this.onRecorded});

  @override
  State<VoiceRecorderButton> createState() => _VoiceRecorderButtonState();
}

class _VoiceRecorderButtonState extends State<VoiceRecorderButton> {
  final AudioRecorder _recorder = AudioRecorder();
  bool _recording = false;
  int _seconds = 0;
  Timer? _timer;
  String? _path;

  @override
  void dispose() {
    _timer?.cancel();
    _recorder.dispose();
    super.dispose();
  }

  Future<void> _start() async {
    final status = await Permission.microphone.request();
    if (!status.isGranted) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Autorisez le microphone pour enregistrer un message vocal.'), backgroundColor: AppColors.error),
        );
      }
      return;
    }
    final dir = await getTemporaryDirectory();
    _path = '${dir.path}/vocal_${DateTime.now().millisecondsSinceEpoch}.m4a';
    await _recorder.start(const RecordConfig(encoder: AudioEncoder.aacLc), path: _path!);
    setState(() {
      _recording = true;
      _seconds = 0;
    });
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _seconds++);
    });
  }

  Future<void> _stopAndSend() async {
    _timer?.cancel();
    final path = await _recorder.stop();
    setState(() => _recording = false);
    if (path != null && _seconds >= 1) {
      widget.onRecorded(File(path), _seconds);
    }
  }

  Future<void> _cancel() async {
    _timer?.cancel();
    await _recorder.stop();
    if (_path != null) {
      final f = File(_path!);
      if (await f.exists()) await f.delete();
    }
    setState(() => _recording = false);
  }

  @override
  Widget build(BuildContext context) {
    if (!_recording) {
      return IconButton(
        icon: const Icon(Icons.mic_none, color: AppColors.primaryGreen),
        onPressed: _start,
      );
    }
    final minutes = (_seconds ~/ 60).toString().padLeft(2, '0');
    final secs = (_seconds % 60).toString().padLeft(2, '0');
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        IconButton(icon: const Icon(Icons.close, color: AppColors.error), onPressed: _cancel),
        Text('$minutes:$secs', style: const TextStyle(color: AppColors.error, fontWeight: FontWeight.bold)),
        const SizedBox(width: 4),
        IconButton(icon: const Icon(Icons.send, color: AppColors.primaryGreen), onPressed: _stopAndSend),
      ],
    );
  }
}
