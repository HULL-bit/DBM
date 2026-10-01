import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'core/routes/app_router.dart';
import 'core/theme/app_theme.dart';
import 'data/providers/auth_provider.dart';
import 'data/services/signalement_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Tout plantage (erreur d'affichage d'un écran ou exception non gérée) est signalé
  // automatiquement à l'administrateur, en plus du comportement Flutter habituel.
  FlutterError.onError = (details) {
    FlutterError.presentError(details);
    SignalementService.signaler(
      details.exception,
      details.stack,
      contexte: details.context?.toDescription() ?? details.library ?? '',
    );
  };
  PlatformDispatcher.instance.onError = (erreur, stack) {
    SignalementService.signaler(erreur, stack, critique: true);
    return false;
  };

  await initializeDateFormatting('fr_FR', null);
  runApp(const MyApp());
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  late final AuthProvider _authProvider;
  late final AppRouter _appRouter;

  @override
  void initState() {
    super.initState();
    _authProvider = AuthProvider()..checkAuth();
    _appRouter = AppRouter(_authProvider);
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: _authProvider),
      ],
      child: MaterialApp.router(
        title: 'Daara Barakatul Mahaahidi',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        // Since dark theme isn't explicitly defined/requested, we'll start with lightTheme as default.
        routerConfig: _appRouter.router,
      ),
    );
  }
}
