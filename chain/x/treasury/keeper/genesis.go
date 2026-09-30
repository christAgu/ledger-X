package keeper

import (
	"context"

	"cosmossdk.io/collections"

	"ledgerx/x/treasury/types"
)

func (k Keeper) InitGenesis(ctx context.Context, genState types.GenesisState) error {
	if err := genState.Validate(); err != nil {
		return err
	}
	if err := k.Params.Set(ctx, genState.Params); err != nil {
		return err
	}
	for _, ref := range genState.DepositRefs {
		if err := k.DepositRefs.Set(ctx, ref); err != nil {
			return err
		}
	}
	for _, ref := range genState.CashoutRefs {
		if err := k.CashoutRefs.Set(ctx, ref); err != nil {
			return err
		}
	}
	return nil
}

func (k Keeper) ExportGenesis(ctx context.Context) (*types.GenesisState, error) {
	genesis := types.DefaultGenesis()
	params, err := k.Params.Get(ctx)
	if err != nil {
		return nil, err
	}
	genesis.Params = params
	genesis.DepositRefs, err = exportReferenceSet(ctx, k.DepositRefs)
	if err != nil {
		return nil, err
	}
	genesis.CashoutRefs, err = exportReferenceSet(ctx, k.CashoutRefs)
	if err != nil {
		return nil, err
	}
	return genesis, nil
}

func exportReferenceSet(ctx context.Context, refs collections.KeySet[string]) ([]string, error) {
	iter, err := refs.Iterate(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer iter.Close()
	return iter.Keys()
}
