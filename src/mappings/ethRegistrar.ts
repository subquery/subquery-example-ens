import {
  byteArrayFromHex,
  concat,
  createEventID,
  uint256ToByteArray,
} from "./utils";

// Import event types from the registry contract ABI
import {
  NameRegisteredEvent,
  NameRenewedEvent,
  TransferEvent,
} from "../types/ethers-contracts/BaseRegistrar";

import { NameRegisteredEvent as ControllerNameRegisteredEventOld } from "../types/ethers-contracts/EthRegistrarControllerOld";

import {
  NameRegisteredEvent as ControllerNameRegisteredEvent,
  NameRenewedEvent as ControllerNameRenewedEvent,
} from "../types/ethers-contracts/EthRegistrarController";

// Import entity types generated from the GraphQL schema
import {
  Account,
  Domain,
  NameRegistered,
  NameRenewed,
  NameTransferred,
  Registration,
} from "../types/models";
import { EthereumLog } from "@subql/types-ethereum";
import { keccak256 } from "@ethersproject/keccak256";

var rootNode = byteArrayFromHex(
  "93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae"
);

export async function handleNameRegistered(
  event: EthereumLog<NameRegisteredEvent["args"]>
): Promise<void> {
  let account = new Account(event.args.owner);
  await account.save();

  let label = uint256ToByteArray(event.args.id.toHexString());
  let registration = new Registration(label.toString());
  let domain = await Domain.get(
    keccak256(concat(rootNode.toString(), label.toString()))
  );

  registration.domainId = domain.id;
  registration.registrationDate = event.block.timestamp;
  registration.expiryDate = event.args.expires.toBigInt();
  registration.registrantId = account.id;

  //  let labelName = ens.nameByHash(label.toHexString())
  let labelName = label.toString();
  if (labelName != null && labelName != undefined) {
    domain.labelName = labelName;
    domain.name = labelName + ".eth";
    registration.labelName = labelName;
  }

  await Promise.all([domain.save(), registration.save()]);

  let registrationEvent = new NameRegistered(createEventID(event));
  registrationEvent.registrationId = registration.id;
  registrationEvent.blockNumber = event.block.number;
  registrationEvent.transactionID = event.transactionHash;
  registrationEvent.registrantId = account.id;
  registrationEvent.expiryDate = event.args.expires.toBigInt();
  await registrationEvent.save();
}

export async function handleNameRegisteredByControllerOld(
  event: ControllerNameRegisteredEventOld
): Promise<void> {
  await setNamePreimage(
    event.args.name,
    event.args.label,
    event.args.cost.toBigInt()
  );
}

export async function handleNameRegisteredByController(
  event: ControllerNameRegisteredEvent
): Promise<void> {
  await setNamePreimage(
    event.args.name,
    event.args.label,
    event.args.baseCost.add(event.args.premium).toBigInt()
  );
}

export async function handleNameRenewedByController(
  event: EthereumLog<ControllerNameRenewedEvent["args"]>
): Promise<void> {
  await setNamePreimage(
    event.args.name,
    event.args.label,
    event.args.cost.toBigInt()
  );
}

function checkValidLabel(name: string): boolean {
  for (let i = 0; i < name.length; i++) {
    let c = name.charCodeAt(i);
    if (c === 0) {
      logger.warn("Invalid label '{}' contained null byte. Skipping.", [name]);
      return false;
    } else if (c === 46) {
      logger.warn(
        "Invalid label '{}' contained separator char '.'. Skipping.",
        [name]
      );
      return false;
    }
  }

  return true;
}

async function setNamePreimage(
  name: string,
  label: string,
  cost: bigint
): Promise<void> {
  if (!checkValidLabel(name)) {
    return;
  }

  let domain = await Domain.get(keccak256(concat(rootNode.toString(), label)));
  if (domain.labelName !== name) {
    domain.labelName = name;
    domain.name = name + ".eth";
    await domain.save();
  }

  let registration = await Registration.get(label);
  if (registration == null || registration == undefined) return;
  registration.labelName = name;
  registration.cost = cost;
  await registration.save();
}

export async function handleNameRenewed(
  event: EthereumLog<NameRenewedEvent["args"]>
): Promise<void> {
  let label = uint256ToByteArray(event.args.id.toHexString());
  // let label = event.args.id.toHexString()
  let registration = await Registration.get(label.toString());
  registration.expiryDate = event.args.expires.toBigInt();
  await registration.save();

  let registrationEvent = new NameRenewed(createEventID(event));
  registrationEvent.registrationId = registration.id;
  registrationEvent.blockNumber = event.block.number;
  registrationEvent.transactionID = event.transactionHash;
  registrationEvent.expiryDate = event.args.expires.toBigInt();
  await registrationEvent.save();
}

export async function handleNameTransferred(
  event: EthereumLog<TransferEvent["args"]>
): Promise<void> {
  let account = new Account(event.args.to);
  await account.save();

  let label = uint256ToByteArray(event.args.tokenId.toHexString());
  let registration = await Registration.get(label.toString());
  if (registration == null || registration == undefined) return;

  registration.registrantId = account.id;
  await registration.save();

  let transferEvent = new NameTransferred(createEventID(event));
  transferEvent.registrationId = label.toString();
  transferEvent.blockNumber = event.block.number;
  transferEvent.transactionID = event.transactionHash;
  transferEvent.newOwnerId = account.id;
  await transferEvent.save();
}
