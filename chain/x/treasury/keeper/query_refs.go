package keeper

import (
	"context"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"ledgerx/x/treasury/types"
)

func (q queryServer) DepositRef(ctx context.Context, req *types.QueryDepositRefRequest) (*types.QueryDepositRefResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request")
	}
	used, err := q.k.DepositRefs.Has(ctx, req.Ref)
	if err != nil {
		return nil, status.Error(codes.Internal, "internal error")
	}
	return &types.QueryDepositRefResponse{Used: used}, nil
}

func (q queryServer) CashoutRef(ctx context.Context, req *types.QueryCashoutRefRequest) (*types.QueryCashoutRefResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request")
	}
	used, err := q.k.CashoutRefs.Has(ctx, req.Ref)
	if err != nil {
		return nil, status.Error(codes.Internal, "internal error")
	}
	return &types.QueryCashoutRefResponse{Used: used}, nil
}
