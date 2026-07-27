import 'package:intl/intl.dart';

/// Formats integer minor-currency-unit amounts (cents) for display. The
/// backend is always the source of truth for money as integers - this is a
/// display-only helper, never used for calculations.
class MoneyFormatter {
  final NumberFormat _format;

  MoneyFormatter({String currency = 'USD', String locale = 'en_US'})
      : _format = NumberFormat.currency(locale: locale, name: currency);

  String format(int cents) => _format.format(cents / 100);
}
