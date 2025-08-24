import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { IProvider } from '@web3auth/base';

export interface WalletAdapter {
  publicKey: PublicKey | null;
  signTransaction?: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions?: (transactions: Transaction[]) => Promise<Transaction[]>;
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
}

export class Web3AuthWalletAdapter implements WalletAdapter {
  private provider: IProvider | null;
  private _publicKey: PublicKey | null = null;

  constructor(provider: IProvider | null) {
    this.provider = provider;
    this.initializePublicKey();
  }

  private async initializePublicKey() {
    if (this.provider) {
      try {
        const accounts = await this.provider.request({
          method: 'getAccounts',
        });
        
        if (accounts && accounts.length > 0) {
          this._publicKey = new PublicKey(accounts[0]);
        }
      } catch (error) {
        console.error('Error getting accounts:', error);
      }
    }
  }

  get publicKey(): PublicKey | null {
    return this._publicKey;
  }

  async signTransaction(transaction: Transaction): Promise<Transaction> {
    if (!this.provider) {
      throw new Error('Wallet not connected');
    }

    try {
      const signedTransaction = await this.provider.request({
        method: 'signTransaction',
        params: {
          message: transaction.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
          }),
        },
      });

      // 反序列化已签名的交易
      return Transaction.from(signedTransaction.signature);
    } catch (error) {
      console.error('Error signing transaction:', error);
      throw error;
    }
  }

  async signAllTransactions(transactions: Transaction[]): Promise<Transaction[]> {
    if (!this.provider) {
      throw new Error('Wallet not connected');
    }

    try {
      const signedTransactions = await Promise.all(
        transactions.map(tx => this.signTransaction(tx))
      );
      return signedTransactions;
    } catch (error) {
      console.error('Error signing transactions:', error);
      throw error;
    }
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    if (!this.provider) {
      throw new Error('Wallet not connected');
    }

    try {
      const signature = await this.provider.request({
        method: 'signMessage',
        params: {
          message: Array.from(message),
        },
      });

      return new Uint8Array(signature.signature);
    } catch (error) {
      console.error('Error signing message:', error);
      throw error;
    }
  }
}

// 创建Web3Auth钱包适配器的工厂函数
export function createWeb3AuthAdapter(provider: IProvider | null): Web3AuthWalletAdapter {
  return new Web3AuthWalletAdapter(provider);
}
