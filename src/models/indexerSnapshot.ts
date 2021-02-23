import { 
  BigInt,
  BigDecimal,
  ethereum,
} from "@graphprotocol/graph-ts"
  
import {
  Indexer as IndexerEntity,
  IndexerSnapshot as IndexerSnapshotEntity,
} from "../../generated/schema"

import { 
  zeroBD,
  protocolGenesis,
  oneDay,
  zeroBI,
} from '../helpers/constants'


// A class to manage Indexer Snapshot
export class IndexerSnapshot {
    indexerSnapshotEntity: IndexerSnapshotEntity
    indexerEntity: IndexerEntity
    currentBlock: ethereum.Block

  // Initialize an Indexer Snapshot
  constructor(indexerEntity: IndexerEntity, currentBlock: ethereum.Block) {
    this.currentBlock = currentBlock
    this.indexerEntity = indexerEntity
    this._initializeIndexerSnapshotEntity()
  }

  //--- INTERNAL ---//
  _snapshotIdFromDays(pastDays: BigInt): string {
    let daysSinceGenesis = this.currentBlock.timestamp.minus(protocolGenesis()).div(oneDay())
    let snapshotDays = daysSinceGenesis.minus(pastDays)    
    let snapshotId = this.indexerEntity.id.concat('-').concat(snapshotDays.toString())
    return snapshotId
  }

  _updatePastRewards(): void {
      // Determine the previous day rewards
      for(let i=1; i<31; i++) {
        // Deterime the ID of the snapshot
        let pastSnapshotId = this._snapshotIdFromDays(BigInt.fromI32(i))
        let pastSnapshot = IndexerSnapshotEntity.load(pastSnapshotId)
        
        // If a snapshot is found, update previous counters
        if(pastSnapshot != null) {
          let pastSnapshotDelegationRewards = pastSnapshot.delegationRewards
          if(i == 1) {
            this.indexerSnapshotEntity.previousDelegationRewardsDay = this.indexerSnapshotEntity.previousDelegationRewardsDay.plus(pastSnapshotDelegationRewards)
          }
          if(i < 8) {
            this.indexerSnapshotEntity.previousDelegationRewardsWeek = this.indexerSnapshotEntity.previousDelegationRewardsWeek.plus(pastSnapshotDelegationRewards)
          }
          this.indexerSnapshotEntity.previousDelegationRewardsMonth = this.indexerSnapshotEntity.previousDelegationRewardsMonth.plus(pastSnapshotDelegationRewards)
        }
      }
  }

  _initializeIndexerSnapshotEntity(): void {
    // Lazy load the snapshot
    let indexerSnapshotEntity = IndexerSnapshotEntity.load(this.id)
    if(indexerSnapshotEntity == null) {
      // Basic Initialization
      indexerSnapshotEntity = new IndexerSnapshotEntity(this.id)
      indexerSnapshotEntity.indexer = this.indexerEntity.id
      indexerSnapshotEntity.createdAtTimestamp = this.currentBlock.timestamp
      indexerSnapshotEntity.ownStakeInitial = zeroBD()
      indexerSnapshotEntity.delegatedStakeInitial = zeroBD()
      indexerSnapshotEntity.ownStakeDelta = zeroBD()
      indexerSnapshotEntity.delegatedStakeDelta = zeroBD()
      indexerSnapshotEntity.delegationRewards = zeroBD()
      indexerSnapshotEntity.parametersChangeCount = 0
      indexerSnapshotEntity.previousDelegationRewardsDay = zeroBD()
      indexerSnapshotEntity.previousDelegationRewardsWeek = zeroBD()
      indexerSnapshotEntity.previousDelegationRewardsMonth = zeroBD()

      if(this.indexerEntity.ownStake != null) {
        indexerSnapshotEntity.ownStakeInitial = this.indexerEntity.ownStake as BigDecimal
      }

      if(this.indexerEntity.delegatedStake != null) {
        indexerSnapshotEntity.delegatedStakeInitial = this.indexerEntity.delegatedStake as BigDecimal
      }
    }

    this.indexerSnapshotEntity = indexerSnapshotEntity as IndexerSnapshotEntity
    this._updatePastRewards()
  }

  //--- GETTERS ---//
  get id(): string {
    return this._snapshotIdFromDays(zeroBI())
  }

  get previousDelegationRewardsMonth(): BigDecimal {
    return this.indexerSnapshotEntity.previousDelegationRewardsMonth as BigDecimal
  }

  //-- SETTERS --//
  updateOwnStake(ownStakeDelta: BigDecimal): void {
    this.indexerSnapshotEntity.ownStakeDelta = this.indexerSnapshotEntity.ownStakeDelta.plus(ownStakeDelta)
    this.indexerSnapshotEntity.save()
  }

  updateDelegatedStake(delegatedStakeDelta: BigDecimal): void {
    this.indexerSnapshotEntity.delegatedStakeDelta = this.indexerSnapshotEntity.delegatedStakeDelta.plus(delegatedStakeDelta)
    this.indexerSnapshotEntity.save()
  }

  addDelegationPoolRewards(amount: BigDecimal): void {
    this.indexerSnapshotEntity.delegationRewards = this.indexerSnapshotEntity.delegationRewards.plus(amount)
    this.indexerSnapshotEntity.save()
  }

  incrementParametersChangesCount(): void {
    this.indexerSnapshotEntity.parametersChangeCount = this.indexerSnapshotEntity.parametersChangeCount + 1
    this.indexerSnapshotEntity.save()
  }
}