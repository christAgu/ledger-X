package treasury

import (
	autocliv1 "cosmossdk.io/api/cosmos/autocli/v1"

	"ledgerx/x/treasury/types"
)

// AutoCLIOptions implements the autocli.HasAutoCLIConfig interface.
func (am AppModule) AutoCLIOptions() *autocliv1.ModuleOptions {
	return &autocliv1.ModuleOptions{
		Query: &autocliv1.ServiceCommandDescriptor{
			Service: types.Query_serviceDesc.ServiceName,
			RpcCommandOptions: []*autocliv1.RpcCommandOptions{
				{
					RpcMethod: "Params",
					Use:       "params",
					Short:     "Shows the parameters of the module",
				},
				{
					RpcMethod: "DepositRef",
					Use:       "deposit-ref",
					Short:     "Checks whether a deposit reference was used",
				},
				{
					RpcMethod: "CashoutRef",
					Use:       "cashout-ref",
					Short:     "Checks whether a cashout reference was used",
				},
			},
		},
		Tx: &autocliv1.ServiceCommandDescriptor{
			Service:              types.Msg_serviceDesc.ServiceName,
			EnhanceCustomCommand: true, // only required if you want to use the custom command
			RpcCommandOptions: []*autocliv1.RpcCommandOptions{
				{
					RpcMethod: "MintSynthetic",
					Use:       "mint-synthetic",
					Short:     "Mints a synthetic asset",
				},
				{
					RpcMethod: "BurnSynthetic",
					Use:       "burn-synthetic",
					Short:     "Burns a synthetic asset",
				},
				{
					RpcMethod: "UpdateParams",
					Skip:      true, // skipped because authority gated
				},
			},
		},
	}
}
