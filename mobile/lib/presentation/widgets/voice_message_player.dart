import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';

import '../../core/constants/colors.dart';

/// Lecteur compact pour un message vocal reçu (play/pause + durée).
class VoiceMessagePlayer extends StatefulWidget {
  final String url;
  final int? dureeSecondes;
  final bool light;

  const VoiceMessagePlayer({super.key, required this.url, this.dureeSecondes, this.light = false});

  @override
  State<VoiceMessagePlayer> createState() => _VoiceMessagePlayerState();
}

class _VoiceMessagePlayerState extends State<VoiceMessagePlayer> {
  final AudioPlayer _player = AudioPlayer();
  bool _playing = false;
  Duration _position = Duration.zero;
  Duration _duration = Duration.zero;

  @override
  void initState() {
    super.initState();
    if (widget.dureeSecondes != null) _duration = Duration(seconds: widget.dureeSecondes!);
    _player.onPlayerStateChanged.listen((state) {
      if (mounted) setState(() => _playing = state == PlayerState.playing);
    });
    _player.onDurationChanged.listen((d) {
      if (mounted) setState(() => _duration = d);
    });
    _player.onPositionChanged.listen((p) {
      if (mounted) setState(() => _position = p);
    });
    _player.onPlayerComplete.listen((_) {
      if (mounted) setState(() { _playing = false; _position = Duration.zero; });
    });
  }

  @override
  void dispose() {
    _player.dispose();
    super.dispose();
  }

  Future<void> _toggle() async {
    if (_playing) {
      await _player.pause();
    } else {
      await _player.play(UrlSource(widget.url));
    }
  }

  String _fmt(Duration d) => '${d.inMinutes.toString().padLeft(2, '0')}:${(d.inSeconds % 60).toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    final color = widget.light ? AppColors.white : AppColors.primaryGreen;
    final total = _duration.inMilliseconds > 0 ? _duration : (widget.dureeSecondes != null ? Duration(seconds: widget.dureeSecondes!) : Duration.zero);
    return SizedBox(
      width: 180,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            icon: Icon(_playing ? Icons.pause_circle_filled : Icons.play_circle_fill, color: color, size: 32),
            onPressed: _toggle,
            padding: EdgeInsets.zero,
          ),
          Expanded(
            child: SliderTheme(
              data: SliderTheme.of(context).copyWith(trackHeight: 2, thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 5)),
              child: Slider(
                value: total.inMilliseconds > 0 ? _position.inMilliseconds.clamp(0, total.inMilliseconds).toDouble() : 0,
                max: total.inMilliseconds > 0 ? total.inMilliseconds.toDouble() : 1,
                activeColor: color,
                inactiveColor: color.withOpacity(0.3),
                onChanged: (v) => _player.seek(Duration(milliseconds: v.toInt())),
              ),
            ),
          ),
          Text(_fmt(total - _position > Duration.zero ? total - _position : Duration.zero), style: TextStyle(color: color, fontSize: 10)),
        ],
      ),
    );
  }
}
