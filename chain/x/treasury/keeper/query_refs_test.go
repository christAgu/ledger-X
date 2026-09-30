package keeper_test

import (
	"testing"

	"github.com/stretchr/testify/require"

	"ledgerx/x/treasury/keeper"
	"ledgerx/x/treasury/types"
)

func TestReferenceQueries(t *testing.T) {
	f := initFixture(t)
	require.NoError(t, f.keeper.DepositRefs.Set(f.ctx, "deposit-1"))
	require.NoError(t, f.keeper.CashoutRefs.Set(f.ctx, "cashout-1"))
	queries := keeper.NewQueryServerImpl(f.keeper)

	deposit, err := queries.DepositRef(f.ctx, &types.QueryDepositRefRequest{Ref: "deposit-1"})
	require.NoError(t, err)
	require.True(t, deposit.Used)
	unknownDeposit, err := queries.DepositRef(f.ctx, &types.QueryDepositRefRequest{Ref: "missing"})
	require.NoError(t, err)
	require.False(t, unknownDeposit.Used)

	cashout, err := queries.CashoutRef(f.ctx, &types.QueryCashoutRefRequest{Ref: "cashout-1"})
	require.NoError(t, err)
	require.True(t, cashout.Used)
	unknownCashout, err := queries.CashoutRef(f.ctx, &types.QueryCashoutRefRequest{Ref: "missing"})
	require.NoError(t, err)
	require.False(t, unknownCashout.Used)
}
