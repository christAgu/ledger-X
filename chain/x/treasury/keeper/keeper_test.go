package keeper_test

import (
	"context"
	"fmt"
	"testing"

	"cosmossdk.io/core/address"
	sdkmath "cosmossdk.io/math"
	storetypes "cosmossdk.io/store/types"
	addresscodec "github.com/cosmos/cosmos-sdk/codec/address"
	"github.com/cosmos/cosmos-sdk/runtime"
	"github.com/cosmos/cosmos-sdk/testutil"
	sdk "github.com/cosmos/cosmos-sdk/types"
	moduletestutil "github.com/cosmos/cosmos-sdk/types/module/testutil"
	authtypes "github.com/cosmos/cosmos-sdk/x/auth/types"

	"ledgerx/x/treasury/keeper"
	module "ledgerx/x/treasury/module"
	"ledgerx/x/treasury/types"
)

type fixture struct {
	ctx             context.Context
	keeper          keeper.Keeper
	addressCodec    address.Codec
	bankKeeper      *fakeBankKeeper
	treasuryAddress string
	treasury        sdk.AccAddress
	recipient       sdk.AccAddress
	otherAuthority  string
}

func initFixture(t *testing.T) *fixture {
	t.Helper()

	sdk.GetConfig().SetBech32PrefixForAccount("ledgerx", "ledgerxpub")
	encCfg := moduletestutil.MakeTestEncodingConfig(module.AppModule{})
	addressCodec := addresscodec.NewBech32Codec("ledgerx")
	storeKey := storetypes.NewKVStoreKey(types.StoreKey)
	storeService := runtime.NewKVStoreService(storeKey)
	ctx := testutil.DefaultContextWithDB(t, storeKey, storetypes.NewTransientStoreKey("transient_test")).Ctx
	bankKeeper := newFakeBankKeeper()

	treasury := sdk.AccAddress(bytesOf(1))
	treasuryAddress := mustAddress(t, addressCodec, treasury)
	recipient := sdk.AccAddress(bytesOf(2))
	otherAuthority := mustAddress(t, addressCodec, sdk.AccAddress(bytesOf(3)))
	authority := authtypes.NewModuleAddress(types.GovModuleName)

	k := keeper.NewKeeper(storeService, encCfg.Codec, addressCodec, authority, bankKeeper)
	params := types.NewParams(treasuryAddress, []string{"aXOF", "aEUR", "aUSD"})
	if err := k.Params.Set(ctx, params); err != nil {
		t.Fatalf("failed to set params: %v", err)
	}

	return &fixture{
		ctx:             ctx,
		keeper:          k,
		addressCodec:    addressCodec,
		bankKeeper:      bankKeeper,
		treasuryAddress: treasuryAddress,
		treasury:        treasury,
		recipient:       recipient,
		otherAuthority:  otherAuthority,
	}
}

func mustAddress(t *testing.T, codec address.Codec, raw sdk.AccAddress) string {
	t.Helper()
	value, err := codec.BytesToString(raw)
	if err != nil {
		t.Fatalf("encode address: %v", err)
	}
	return value
}

func bytesOf(value byte) []byte {
	bytes := make([]byte, 20)
	for i := range bytes {
		bytes[i] = value
	}
	return bytes
}

type fakeBankKeeper struct {
	balances map[string]map[string]sdkmath.Int
	supply   map[string]sdkmath.Int
}

func newFakeBankKeeper() *fakeBankKeeper {
	return &fakeBankKeeper{
		balances: make(map[string]map[string]sdkmath.Int),
		supply:   make(map[string]sdkmath.Int),
	}
}

func (b *fakeBankKeeper) SpendableCoins(_ context.Context, address sdk.AccAddress) sdk.Coins {
	coins := sdk.NewCoins()
	for denom, amount := range b.balances[string(address)] {
		if amount.IsPositive() {
			coins = coins.Add(sdk.NewCoin(denom, amount))
		}
	}
	return coins
}

func (b *fakeBankKeeper) SendCoinsFromAccountToModule(_ context.Context, sender sdk.AccAddress, recipientModule string, coins sdk.Coins) error {
	return b.send(string(sender), string(authtypes.NewModuleAddress(recipientModule)), coins)
}

func (b *fakeBankKeeper) SendCoinsFromModuleToAccount(_ context.Context, senderModule string, recipient sdk.AccAddress, coins sdk.Coins) error {
	return b.send(string(authtypes.NewModuleAddress(senderModule)), string(recipient), coins)
}

func (b *fakeBankKeeper) MintCoins(_ context.Context, moduleName string, coins sdk.Coins) error {
	account := string(authtypes.NewModuleAddress(moduleName))
	for _, coin := range coins {
		b.add(account, coin.Denom, coin.Amount)
		b.supply[coin.Denom] = b.amount(b.supply, coin.Denom).Add(coin.Amount)
	}
	return nil
}

func (b *fakeBankKeeper) BurnCoins(_ context.Context, moduleName string, coins sdk.Coins) error {
	return b.burn(string(authtypes.NewModuleAddress(moduleName)), coins)
}

func (b *fakeBankKeeper) seedBalance(account []byte, coin sdk.Coin) {
	b.add(string(account), coin.Denom, coin.Amount)
	b.supply[coin.Denom] = coin.Amount
}

func (b *fakeBankKeeper) balance(account []byte, denom string) sdkmath.Int {
	return b.amount(b.balances[string(account)], denom)
}

func (b *fakeBankKeeper) totalSupply(denom string) sdkmath.Int {
	return b.amount(b.supply, denom)
}

func (b *fakeBankKeeper) amount(balances map[string]sdkmath.Int, denom string) sdkmath.Int {
	amount, exists := balances[denom]
	if !exists {
		return sdkmath.ZeroInt()
	}
	return amount
}

func (b *fakeBankKeeper) add(account, denom string, amount sdkmath.Int) {
	if b.balances[account] == nil {
		b.balances[account] = make(map[string]sdkmath.Int)
	}
	b.balances[account][denom] = b.amount(b.balances[account], denom).Add(amount)
}

func (b *fakeBankKeeper) send(sender, recipient string, coins sdk.Coins) error {
	for _, coin := range coins {
		if b.amount(b.balances[sender], coin.Denom).LT(coin.Amount) {
			return fmt.Errorf("insufficient funds")
		}
	}
	for _, coin := range coins {
		b.balances[sender][coin.Denom] = b.amount(b.balances[sender], coin.Denom).Sub(coin.Amount)
		b.add(recipient, coin.Denom, coin.Amount)
	}
	return nil
}

func (b *fakeBankKeeper) burn(account string, coins sdk.Coins) error {
	for _, coin := range coins {
		if b.amount(b.balances[account], coin.Denom).LT(coin.Amount) {
			return fmt.Errorf("insufficient funds")
		}
	}
	for _, coin := range coins {
		b.balances[account][coin.Denom] = b.amount(b.balances[account], coin.Denom).Sub(coin.Amount)
		b.supply[coin.Denom] = b.amount(b.supply, coin.Denom).Sub(coin.Amount)
	}
	return nil
}
