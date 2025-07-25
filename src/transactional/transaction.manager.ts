import { ContextService } from '@lootupteam/nestjs-core';
import { Inject, Injectable } from '@nestjs/common';
import { TransactionStorageKeyToken } from './transaction-manager.token';

export abstract class Transaction<T = any> {
  constructor(protected readonly _hostTransaction: T) {}

  abstract begin(): Promise<void>;
  abstract commit(): Promise<void>;
  abstract rollback(): Promise<void>;
  abstract end(): Promise<void>;

  get hostTransaction(): T {
    return this._hostTransaction;
  }
}

export interface Connection {
  createTransaction(): Transaction;
}

@Injectable()
export abstract class TransactionManager<T = any> {
  @Inject(TransactionStorageKeyToken) private readonly key: string;

  constructor(protected readonly context: ContextService) {}

  abstract createTransaction(): Promise<Transaction<T>>;

  getRunningTransactionOrDefault(): Transaction<T> {
    return this.context.get(this.key);
  }

  async beginTransaction(): Promise<void> {
    const existingTransaction = this.context.get(this.key);
    if (existingTransaction) {
      throw new Error('Transaction is already running for the current context');
    }
    const transaction = await this.createTransaction();
    await transaction.begin();
    this.context.set(this.key, transaction);
  }

  async commitTransaction(): Promise<void> {
    const transaction = this.getRunningTransactionOrFail();
    await transaction.commit();
    await transaction.end();
  }

  async rollbackTransaction(): Promise<void> {
    const transaction = this.getRunningTransactionOrFail();
    await transaction.rollback();
    await transaction.end();
  }

  private getRunningTransactionOrFail() {
    const transaction = this.context.get<Transaction<T>>(this.key);
    if (!transaction) {
      throw new Error('Transaction is not running for the current context');
    }
    return transaction;
  }
}
