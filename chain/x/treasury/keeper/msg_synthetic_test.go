package keeper_test

import (
	"testing"

	sdkmath "cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/stretchr/testify/require"

	"ledgerx/x/treasury/keeper"
	"ledgerx/x/treasury/types"
)

func TestMintSynthetic(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		f := initFixture(t)
		server := keeper.NewMsgServerImpl(f.keeper)
		amount := sdk.NewCoin("ueurc", sdkmath.NewInt(5_000_000))
		_, err := server.MintSynthetic(f.ctx, &types.MsgMintSynthetic{
			Authority:  f.treasuryAddress,
			Recipient:  mustAddress(t, f.addressCodec, f.recipient),
			Amount:     amount,
			DepositRef: "deposit-1",
		})
		require.NoError(t, err)
		require.True(t, amount.Amount.Equal(f.bankKeeper.balance(f.recipient, "ueurc")))
		require.True(t, amount.Amount.Equal(f.bankKeeper.totalSupply("ueurc")))
	})

	t.Run("unauthorized", func(t *testing.T) {
		f := initFixture(t)
		server := keeper.NewMsgServerImpl(f.keeper)
		_, err := server.MintSynthetic(f.ctx, &types.MsgMintSynthetic{
			Authority:  f.otherAuthority,
			Recipient:  mustAddress(t, f.addressCodec, f.recipient),
			Amount:     sdk.NewCoin("ueurc", sdkmath.NewInt(1)),
			DepositRef: "deposit-1",
		})
		require.ErrorIs(t, err, types.ErrUnauthorized)
	})

	for _, denom := range []string{"uledx", "aGBP", "aXOF"} {
		t.Run("disallowed "+denom, func(t *testing.T) {
			f := initFixture(t)
			server := keeper.NewMsgServerImpl(f.keeper)
			_, err := server.MintSynthetic(f.ctx, &types.MsgMintSynthetic{
				Authority:  f.treasuryAddress,
				Recipient:  mustAddress(t, f.addressCodec, f.recipient),
				Amount:     sdk.NewCoin(denom, sdkmath.NewInt(1)),
				DepositRef: "deposit-1",
			})
			require.ErrorIs(t, err, types.ErrInvalidDenom)
		})
	}

	t.Run("duplicate reference", func(t *testing.T) {
		f := initFixture(t)
		server := keeper.NewMsgServerImpl(f.keeper)
		msg := &types.MsgMintSynthetic{
			Authority:  f.treasuryAddress,
			Recipient:  mustAddress(t, f.addressCodec, f.recipient),
			Amount:     sdk.NewCoin("ueurc", sdkmath.NewInt(1)),
			DepositRef: "deposit-1",
		}
		_, err := server.MintSynthetic(f.ctx, msg)
		require.NoError(t, err)
		_, err = server.MintSynthetic(f.ctx, msg)
		require.ErrorIs(t, err, types.ErrDuplicateRef)
	})
}

func TestBurnSynthetic(t *testing.T) {
	t.Run("success reduces supply", func(t *testing.T) {
		f := initFixture(t)
		initial := sdkmath.NewInt(1000)
		f.bankKeeper.seedBalance(f.treasury, sdk.NewCoin("ueurc", initial))
		server := keeper.NewMsgServerImpl(f.keeper)
		_, err := server.BurnSynthetic(f.ctx, &types.MsgBurnSynthetic{
			Authority:  f.treasuryAddress,
			Amount:     sdk.NewCoin("ueurc", sdkmath.NewInt(500)),
			CashoutRef: "cashout-1",
		})
		require.NoError(t, err)
		require.True(t, sdkmath.NewInt(500).Equal(f.bankKeeper.totalSupply("ueurc")))
	})

	t.Run("unauthorized", func(t *testing.T) {
		f := initFixture(t)
		server := keeper.NewMsgServerImpl(f.keeper)
		_, err := server.BurnSynthetic(f.ctx, &types.MsgBurnSynthetic{
			Authority:  f.otherAuthority,
			Amount:     sdk.NewCoin("ueurc", sdkmath.NewInt(1)),
			CashoutRef: "cashout-1",
		})
		require.ErrorIs(t, err, types.ErrUnauthorized)
	})

	t.Run("duplicate cashout reference", func(t *testing.T) {
		f := initFixture(t)
		f.bankKeeper.seedBalance(f.treasury, sdk.NewCoin("ueurc", sdkmath.NewInt(1000)))
		server := keeper.NewMsgServerImpl(f.keeper)
		msg := &types.MsgBurnSynthetic{
			Authority:  f.treasuryAddress,
			Amount:     sdk.NewCoin("ueurc", sdkmath.NewInt(500)),
			CashoutRef: "cashout-1",
		}
		_, err := server.BurnSynthetic(f.ctx, msg)
		require.NoError(t, err)
		_, err = server.BurnSynthetic(f.ctx, msg)
		require.ErrorIs(t, err, types.ErrDuplicateRef)
	})
}

func TestParamsValidation(t *testing.T) {
	f := initFixture(t)

	require.NoError(t, types.NewParams(f.treasuryAddress, []string{"ueurc"}).Validate())
	require.Error(t, types.NewParams("not-bech32", []string{"ueurc"}).Validate())
	require.Error(t, types.NewParams("", []string{"ueurc", "ueurc"}).Validate())
	require.Error(t, types.NewParams("", []string{"not valid"}).Validate())
}
