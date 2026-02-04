import { Router } from 'express';
import type { Request, Response } from 'express';
import { 
  CreateBountyRequest, 
  ClaimBountyRequest, 
  SubmitProofRequest, 
  ApproveBountyRequest,
  CancelBountyRequest,
  RejectBountyRequest,
  FinalizeBountyRequest,
  LinkXRequest,
  ApiResponse,
  Bounty,
  CreatorProfile
} from '../types';

export const bountyRouter = Router();

// GET /api/bounties - List all bounties
bountyRouter.get('/', async (req: Request, res: Response) => {
  try {
    const status = Array.isArray(req.query.status) ? req.query.status[0] : (req.query.status as string | undefined);
    const limit = Array.isArray(req.query.limit) ? req.query.limit[0] : (req.query.limit as string | undefined) ?? '50';
    const offset = Array.isArray(req.query.offset) ? req.query.offset[0] : (req.query.offset as string | undefined) ?? '0';
    
    // TODO: Fetch from on-chain or cached DB
    const bounties: Bounty[] = [];
    
    res.json({
      success: true,
      data: {
        bounties,
        total: bounties.length,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    } as ApiResponse<any>);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    } as ApiResponse<never>);
  }
});

// GET /api/bounties/:id - Get single bounty
bountyRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // TODO: Fetch bounty from chain
    
    res.json({
      success: true,
      data: null, // placeholder
    } as ApiResponse<Bounty | null>);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    } as ApiResponse<never>);
  }
});

// POST /api/bounties/create - Create new bounty
bountyRouter.post('/create', async (req: Request, res: Response) => {
  try {
    const body: CreateBountyRequest = req.body;
    
    // TODO: 
    // 1. Validate request
    // 2. Build Anchor instruction
    // 3. Construct transaction
    // 4. Return unsigned transaction
    
    res.json({
      success: true,
      data: {
        transaction: 'base64_tx_placeholder',
        bountyId: 'pda_address_placeholder',
      },
    } as ApiResponse<any>);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    } as ApiResponse<never>);
  }
});

// POST /api/bounties/claim - Claim a bounty
bountyRouter.post('/claim', async (req: Request, res: Response) => {
  try {
    const body: ClaimBountyRequest = req.body;
    
    // TODO: Build claim transaction
    
    res.json({
      success: true,
      data: {
        transaction: 'base64_tx_placeholder',
      },
    } as ApiResponse<any>);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    } as ApiResponse<never>);
  }
});

// POST /api/bounties/submit - Submit proof
bountyRouter.post('/submit', async (req: Request, res: Response) => {
  try {
    const body: SubmitProofRequest = req.body;
    
    // TODO: Build submit transaction
    
    res.json({
      success: true,
      data: {
        transaction: 'base64_tx_placeholder',
      },
    } as ApiResponse<any>);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    } as ApiResponse<never>);
  }
});

// POST /api/bounties/approve - Approve proof and pay
bountyRouter.post('/approve', async (req: Request, res: Response) => {
  try {
    const body: ApproveBountyRequest = req.body;
    
    // TODO: Build approve transaction
    
    res.json({
      success: true,
      data: {
        transaction: 'base64_tx_placeholder',
      },
    } as ApiResponse<any>);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    } as ApiResponse<never>);
  }
});

// POST /api/bounties/cancel - Cancel bounty and refund
bountyRouter.post('/cancel', async (req: Request, res: Response) => {
  try {
    const body: CancelBountyRequest = req.body;
    
    // TODO: Build cancel transaction
    
    res.json({
      success: true,
      data: {
        transaction: 'base64_tx_placeholder',
      },
    } as ApiResponse<any>);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    } as ApiResponse<never>);
  }
});

// POST /api/bounties/reject - Creator rejects submitted proof
bountyRouter.post('/reject', async (req: Request, res: Response) => {
  try {
    const body: RejectBountyRequest = req.body;
    
    // TODO: Build reject transaction (reopens bounty, -15 rep)
    
    res.json({
      success: true,
      data: {
        transaction: 'base64_tx_placeholder',
      },
    } as ApiResponse<any>);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    } as ApiResponse<never>);
  }
});

// POST /api/bounties/finalize - Auto-pay agent after 48h review window
bountyRouter.post('/finalize', async (req: Request, res: Response) => {
  try {
    const body: FinalizeBountyRequest = req.body;
    
    // TODO: Build finalize transaction (pays agent, -30 rep to creator)
    
    res.json({
      success: true,
      data: {
        transaction: 'base64_tx_placeholder',
      },
    } as ApiResponse<any>);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    } as ApiResponse<never>);
  }
});

// GET /api/bounties/profile/:wallet - Get creator profile
bountyRouter.get('/profile/:wallet', async (req: Request, res: Response) => {
  try {
    const wallet = String(req.params.wallet);
    
    // TODO: Fetch CreatorProfile from on-chain
    const profile: CreatorProfile = {
      wallet,
      reputation: 100,
      totalCreated: 0,
      totalCompleted: 0,
      totalRejected: 0,
      totalAutoFinalized: 0,
      totalCancelled: 0,
      xHandle: '',
      xVerified: false,
    };
    
    res.json({
      success: true,
      data: profile,
    } as ApiResponse<CreatorProfile>);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    } as ApiResponse<never>);
  }
});

// POST /api/bounties/link-x - Link verified X handle
bountyRouter.post('/link-x', async (req: Request, res: Response) => {
  try {
    const body: LinkXRequest = req.body;
    
    // TODO:
    // 1. Verify wallet signature of "Link X:@<handle> to AgentGrind"
    // 2. Call X API to verify handle exists
    // 3. If valid, build + return link_x on-chain transaction
    
    res.json({
      success: true,
      data: {
        transaction: 'base64_tx_placeholder',
        xHandle: body.xHandle,
      },
    } as ApiResponse<any>);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    } as ApiResponse<never>);
  }
});
