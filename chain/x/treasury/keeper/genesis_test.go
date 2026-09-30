package keeper_test

import (
	"testing"

	"ledgerx/x/treasury/types"

	"github.com/stretchr/testify/require"
)

func TestGenesis(t *testing.T) {
	genesisState := types.GenesisState{
		Params:      types.DefaultParams(),
		DepositRefs: []string{"deposit-1"},
		CashoutRefs: []string{"cashout-1"},
	}

	f := initFixture(t)
	err := f.keeper.InitGenesis(f.ctx, genesisState)
	require.NoError(t, err)
	got, err := f.keeper.ExportGenesis(f.ctx)
	require.NoError(t, err)
	require.NotNil(t, got)

	require.EqualExportedValues(t, genesisState.Params, got.Params)
	require.Equal(t, genesisState.DepositRefs, got.DepositRefs)
	require.Equal(t, genesisState.CashoutRefs, got.CashoutRefs)
}
