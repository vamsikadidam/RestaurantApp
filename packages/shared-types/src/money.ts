/**
 * All money values in API requests/responses are integers in minor currency
 * units (cents for USD). Never represent money as a float anywhere in the
 * stack - see SECURITY.md and README.md for rationale.
 */
export type MinorCurrencyAmount = number;

export interface MoneyAmount {
  amountCents: MinorCurrencyAmount;
  currency: string;
}
