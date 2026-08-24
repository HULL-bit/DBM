import 'package:flutter_test/flutter_test.dart';
import 'package:dbm_mobile/main.dart'; // Adjust path internally

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const MyApp());

    // Wait for the app router to initialize and render the initial screen (Login)
    await tester.pumpAndSettle();

    // Verify if our Login form widget with text 'Bienvenue' is shown
    expect(find.text('Bienvenue'), findsWidgets);
  });
}
