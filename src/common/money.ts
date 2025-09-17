import { Decimal } from "@prisma/client/runtime/library";

export class Money {
  private cents: number;

  constructor(amount: number | string | Decimal) {
    // Convert to cents for internal storage
    if (amount instanceof Decimal) {
      this.cents = Math.round(amount.toNumber() * 100);
    } else {
      this.cents = Math.round(Number(amount) * 100);
    }
  }

  static fromCents(cents: number): Money {
    const money = Object.create(Money.prototype);
    money.cents = cents;
    return money;
  }

  toDollars(): number {
    return this.cents / 100;
  }

  toCents(): number {
    return this.cents;
  }

  add(other: Money): Money {
    return Money.fromCents(this.cents + other.cents);
  }

  multiply(factor: number): Money {
    return Money.fromCents(Math.round(this.cents * factor));
  }

  toString(): string {
    return (this.cents / 100).toFixed(2);
  }
}
