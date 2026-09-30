package types

func DefaultGenesis() *GenesisState {
	return &GenesisState{
		Params: DefaultParams(),
	}
}

func (gs GenesisState) Validate() error {
	if err := gs.Params.Validate(); err != nil {
		return err
	}
	if err := validateReferences(gs.DepositRefs); err != nil {
		return err
	}
	return validateReferences(gs.CashoutRefs)
}
