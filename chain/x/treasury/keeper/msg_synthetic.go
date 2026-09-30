package keeper

import (
	"context"
	"fmt"

	sdk "github.com/cosmos/cosmos-sdk/types"

	"ledgerx/x/treasury/types"
)

func (k msgServer) MintSynthetic(ctx context.Context, req *types.MsgMintSynthetic) (*types.MsgMintSyntheticResponse, error) {
	if req == nil {
		return nil, fmt.Errorf("nil mint request")
	}

	params, err := k.authorizedParams(ctx, req.Authority)
	if err != nil {
		return nil, err
	}
	if err := validateSyntheticAmount(params, req.Amount); err != nil {
		return nil, err
	}
	if err := types.ValidateReferenceForMsg(req.DepositRef); err != nil {
		return nil, err
	}

	used, err := k.DepositRefs.Has(ctx, req.DepositRef)
	if err != nil {
		return nil, err
	}
	if used {
		return nil, fmt.Errorf("%w: %s", types.ErrDuplicateRef, req.DepositRef)
	}

	recipient, err := k.addressCodec.StringToBytes(req.Recipient)
	if err != nil {
		return nil, fmt.Errorf("invalid recipient address: %w", err)
	}
	coins := sdk.NewCoins(req.Amount)
	if err := k.bankKeeper.MintCoins(ctx, types.ModuleName, coins); err != nil {
		return nil, err
	}
	if err := k.bankKeeper.SendCoinsFromModuleToAccount(ctx, types.ModuleName, recipient, coins); err != nil {
		return nil, err
	}
	if err := k.DepositRefs.Set(ctx, req.DepositRef); err != nil {
		return nil, err
	}

	sdk.UnwrapSDKContext(ctx).EventManager().EmitEvent(sdk.NewEvent(
		types.EventTypeSyntheticMinted,
		sdk.NewAttribute(types.AttributeKeyRecipient, req.Recipient),
		sdk.NewAttribute(types.AttributeKeyAmount, req.Amount.String()),
		sdk.NewAttribute(types.AttributeKeyDepositRef, req.DepositRef),
	))

	return &types.MsgMintSyntheticResponse{}, nil
}

func (k msgServer) BurnSynthetic(ctx context.Context, req *types.MsgBurnSynthetic) (*types.MsgBurnSyntheticResponse, error) {
	if req == nil {
		return nil, fmt.Errorf("nil burn request")
	}

	params, err := k.authorizedParams(ctx, req.Authority)
	if err != nil {
		return nil, err
	}
	if err := validateSyntheticAmount(params, req.Amount); err != nil {
		return nil, err
	}
	if err := types.ValidateReferenceForMsg(req.CashoutRef); err != nil {
		return nil, err
	}

	used, err := k.CashoutRefs.Has(ctx, req.CashoutRef)
	if err != nil {
		return nil, err
	}
	if used {
		return nil, fmt.Errorf("%w: %s", types.ErrDuplicateRef, req.CashoutRef)
	}

	treasury, err := k.addressCodec.StringToBytes(params.TreasuryAddress)
	if err != nil {
		return nil, fmt.Errorf("invalid treasury address: %w", err)
	}
	coins := sdk.NewCoins(req.Amount)
	if err := k.bankKeeper.SendCoinsFromAccountToModule(ctx, treasury, types.ModuleName, coins); err != nil {
		return nil, err
	}
	if err := k.bankKeeper.BurnCoins(ctx, types.ModuleName, coins); err != nil {
		return nil, err
	}
	if err := k.CashoutRefs.Set(ctx, req.CashoutRef); err != nil {
		return nil, err
	}

	sdk.UnwrapSDKContext(ctx).EventManager().EmitEvent(sdk.NewEvent(
		types.EventTypeSyntheticBurned,
		sdk.NewAttribute(types.AttributeKeyAmount, req.Amount.String()),
		sdk.NewAttribute(types.AttributeKeyCashoutRef, req.CashoutRef),
	))

	return &types.MsgBurnSyntheticResponse{}, nil
}

func (k msgServer) authorizedParams(ctx context.Context, authority string) (types.Params, error) {
	params, err := k.Params.Get(ctx)
	if err != nil {
		return types.Params{}, err
	}
	if params.TreasuryAddress == "" || authority != params.TreasuryAddress {
		return types.Params{}, types.ErrUnauthorized
	}
	return params, nil
}

func validateSyntheticAmount(params types.Params, amount sdk.Coin) error {
	if err := amount.Validate(); err != nil {
		return fmt.Errorf("%w: %v", types.ErrInvalidAmount, err)
	}
	if !amount.Amount.IsPositive() {
		return types.ErrInvalidAmount
	}
	for _, denom := range params.AllowedDenoms {
		if amount.Denom == denom {
			return nil
		}
	}
	return fmt.Errorf("%w: %s", types.ErrInvalidDenom, amount.Denom)
}
