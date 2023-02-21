// Import types and APIs from graph-ts

import { Account, Domain } from '../types/models'
import {EthereumLog} from "@subql/types-ethereum";
export function createEventID(event: EthereumLog): string {
  return event.block.number.toString().concat('-').concat(event.logIndex.toString())
}

export const ROOT_NODE = '0x0000000000000000000000000000000000000000000000000000000000000000'
export const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000'

// Helper for concatenating two byte arrays
export function concat(_a: string, _b: string): Uint8Array {

  const a = Buffer.from(_a);
  const b = Buffer.from(_b);

  let out = new Uint8Array(a.length + b.length)
  for (let i = 0; i < a.length; i++) {
    out[i] = a[i]
  }
  for (let j = 0; j < b.length; j++) {
    out[a.length + j] = b[j]
  }
  // return out as ByteArray
  return out
}

export function byteArrayFromHex(s: string): Uint8Array {
  if(s.length % 2 !== 0) {
    throw new TypeError("Hex string must have an even number of characters")
  }
  let out = new Uint8Array(s.length / 2)
  for(var i = 0; i < s.length; i += 2) {
    out[i / 2] = parseInt(s.substring(i, i + 2), 16) as u32
  }
  return out
}

// From a hex string
export function uint256ToByteArray(i: string): Uint8Array {
  let hex = i.slice(2).padStart(64, '0')
  return byteArrayFromHex(hex)
}

export async function createOrLoadAccount(address: string): Promise<Account> {
  let account = await Account.get(address)
  if (account == null) {
    account = new Account(address)
    await account.save()
  }
  return account
}

export async function createOrLoadDomain(node: string): Promise<Domain> {
  let domain = await Domain.get(node)
  if (domain == null || domain == undefined) {
    domain = new Domain(node)
    await domain.save()
  }
  return domain
}
