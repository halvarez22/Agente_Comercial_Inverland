// Value Object — Money (immutable, never calculates in LLM)
export class Money {
  private readonly _amount: number;
  private readonly _currency: string;

  constructor(amount: number, currency = 'MXN') {
    if (amount < 0) throw new Error('Money amount cannot be negative');
    this._amount = amount;
    this._currency = currency;
  }

  get amount(): number { return this._amount; }
  get currency(): string { return this._currency; }

  format(): string {
    return `$${this._amount.toLocaleString('es-MX')} ${this._currency}`;
  }

  equals(other: Money): boolean {
    return this._amount === other._amount && this._currency === other._currency;
  }
}

// Value Object — LeadScore (0-100)
export class LeadScore {
  private readonly _value: number;

  constructor(value: number) {
    if (value < 0 || value > 100) throw new Error('LeadScore must be between 0 and 100');
    this._value = Math.round(value);
  }

  get value(): number { return this._value; }

  get label(): 'cold' | 'warm' | 'hot' {
    if (this._value < 40) return 'cold';
    if (this._value < 70) return 'warm';
    return 'hot';
  }

  isHot(): boolean { return this._value >= 70; }
}
