
import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

describe("LegalChain - Basic Contract Deployment and Initialization", () => {
  it("should have correct initial state after deployment", () => {
    expect(simnet.blockHeight).toBeDefined();
    expect(simnet.blockHeight).toBeGreaterThan(0);
  });

  it("should have pre-initialized jurisdictions", () => {
    const { result: usNyJurisdiction } = simnet.callReadOnlyFn(
      "legal_chain",
      "get-jurisdiction-info",
      [Cl.stringAscii("US-NY")],
      deployer
    );
    
    expect(usNyJurisdiction).toBeSome(
      Cl.tuple({
        name: Cl.stringAscii("New York, United States"),
        "legal-system": Cl.stringAscii("common-law"),
        "compliance-requirements": Cl.stringAscii("UCC-compliant"),
        "is-supported": Cl.bool(true),
        "regulatory-body": Cl.none()
      })
    );

    const { result: ukEngJurisdiction } = simnet.callReadOnlyFn(
      "legal_chain",
      "get-jurisdiction-info", 
      [Cl.stringAscii("UK-ENG")],
      deployer
    );
    
    expect(ukEngJurisdiction).toBeSome(
      Cl.tuple({
        name: Cl.stringAscii("England and Wales"),
        "legal-system": Cl.stringAscii("common-law"),
        "compliance-requirements": Cl.stringAscii("UK-contract-law"),
        "is-supported": Cl.bool(true),
        "regulatory-body": Cl.none()
      })
    );

    const { result: deBwJurisdiction } = simnet.callReadOnlyFn(
      "legal_chain",
      "get-jurisdiction-info",
      [Cl.stringAscii("DE-BW")],
      deployer
    );
    
    expect(deBwJurisdiction).toBeSome(
      Cl.tuple({
        name: Cl.stringAscii("Baden-Wurttemberg, Germany"),
        "legal-system": Cl.stringAscii("civil-law"),
        "compliance-requirements": Cl.stringAscii("BGB-compliant"),
        "is-supported": Cl.bool(true),
        "regulatory-body": Cl.none()
      })
    );
  });

  it("should validate supported jurisdictions correctly", () => {
    const { result: supportedJurisdiction } = simnet.callReadOnlyFn(
      "legal_chain",
      "is-jurisdiction-supported",
      [Cl.stringAscii("US-NY")],
      deployer
    );
    expect(supportedJurisdiction).toBeBool(true);

    const { result: unsupportedJurisdiction } = simnet.callReadOnlyFn(
      "legal_chain",
      "is-jurisdiction-supported", 
      [Cl.stringAscii("INVALID")],
      deployer
    );
    expect(unsupportedJurisdiction).toBeBool(false);
  });

  it("should initialize with correct contract state", () => {
    // Test that contract is deployed and accessible
    const { result: contractStatus } = simnet.callReadOnlyFn(
      "legal_chain",
      "get-contract-status",
      [Cl.uint(999)], // Non-existent contract
      deployer
    );
    
    expect(contractStatus).toBeTuple({
      status: Cl.stringAscii("not-found"),
      signatures: Cl.uint(0),
      "required-signatures": Cl.uint(0),
      "expires-at": Cl.uint(0),
      "is-compliant": Cl.tuple({
        "signatures-met": Cl.bool(false),
        "witness-requirement-met": Cl.bool(false),
        "notarization-requirement-met": Cl.bool(false),
        "value-limit-met": Cl.bool(false)
      })
    });
  });

  it("should handle non-existent contract queries gracefully", () => {
    const { result: nonExistentContract } = simnet.callReadOnlyFn(
      "legal_chain",
      "get-legal-contract",
      [Cl.uint(999)],
      deployer
    );
    expect(nonExistentContract).toBeNone();

    const { result: nonExistentTemplate } = simnet.callReadOnlyFn(
      "legal_chain", 
      "get-contract-template",
      [Cl.uint(999)],
      deployer
    );
    expect(nonExistentTemplate).toBeNone();
  });

  it("should handle non-existent legal entity queries gracefully", () => {
    const { result: nonExistentEntity } = simnet.callReadOnlyFn(
      "legal_chain",
      "get-legal-entity",
      [Cl.principal(wallet1)],
      deployer
    );
    expect(nonExistentEntity).toBeNone();
  });

  it("should allow legal entity registration", () => {
    const { result } = simnet.callPublicFn(
      "legal_chain",
      "register-legal-entity",
      [
        Cl.stringAscii("corporation"),
        Cl.stringAscii("US-NY"),
        Cl.stringAscii("12345678"),
        Cl.stringAscii("Test Corporation Inc.")
      ],
      wallet1
    );
    
    expect(result).toBeOk(Cl.bool(true));

    const { result: entityData } = simnet.callReadOnlyFn(
      "legal_chain",
      "get-legal-entity",
      [Cl.principal(wallet1)],
      deployer
    );
    
    expect(entityData).toBeSome(
      Cl.tuple({
        "entity-type": Cl.stringAscii("corporation"),
        jurisdiction: Cl.stringAscii("US-NY"),
        "registration-number": Cl.stringAscii("12345678"),
        "verified-at": Cl.uint(simnet.blockHeight),
        "is-verified": Cl.bool(false),
        "legal-name": Cl.stringAscii("Test Corporation Inc.")
      })
    );
  });

  it("should reject legal entity registration with invalid jurisdiction", () => {
    const { result } = simnet.callPublicFn(
      "legal_chain",
      "register-legal-entity",
      [
        Cl.stringAscii("corporation"),
        Cl.stringAscii("INVALID"),
        Cl.stringAscii("12345678"),
        Cl.stringAscii("Test Corporation Inc.")
      ],
      wallet2
    );
    
    expect(result).toBeErr(Cl.uint(403)); // ERR_INVALID_JURISDICTION
  });
});
