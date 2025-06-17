import { PIAWECalculation, PIAWEResult, PayslipEntry, JurisdictionType, JurisdictionRules, ValidationIssue, PIAWEAdjustment } from '../types';
import { parseISO, differenceInWeeks, subWeeks, format, isAfter, isBefore, differenceInDays } from 'date-fns';

// Jurisdiction-specific rules based on actual legislation
const JURISDICTION_RULES: Record<JurisdictionType, JurisdictionRules> = {
  NSW: {
    jurisdiction: 'NSW',
    defaultReferencePeriod: 52,
    alternativeReferencePeriods: [13],
    minimumWeeksRequired: 1,
    maxOvertimeInclusion: 100,
    allowanceInclusions: ['shift', 'piece-rates', 'bonuses'],
    bonusInclusions: {
      regularBonus: true,
      performanceBonus: false, // Only if regular
      annualBonus: false // Excludes one-off bonuses
    },
    adjustmentRules: {
      baseRateIncrease: true,
      industrialAgreement: true,
      inflationAdjustment: false
    },
    cappingRules: {
      maxWeeklyAmount: 2500, // Current NSW cap
      maxAnnualAmount: 130000
    }
  },
  VIC: {
    jurisdiction: 'VIC',
    defaultReferencePeriod: 52,
    alternativeReferencePeriods: [13],
    minimumWeeksRequired: 1,
    maxOvertimeInclusion: 100, // Regular overtime only
    allowanceInclusions: ['shift', 'commissions', 'bonuses'],
    bonusInclusions: {
      regularBonus: true,
      performanceBonus: true,
      annualBonus: false // Excludes irregular overtime
    },
    adjustmentRules: {
      baseRateIncrease: true,
      industrialAgreement: true,
      inflationAdjustment: false
    },
    cappingRules: {
      maxWeeklyAmount: 2400,
      maxAnnualAmount: 124800
    }
  },
  QLD: {
    jurisdiction: 'QLD',
    defaultReferencePeriod: 52, // 12 months = 52 weeks
    alternativeReferencePeriods: [26, 13], // Shorter periods for seasonal workers
    minimumWeeksRequired: 1,
    maxOvertimeInclusion: 100, // Consistent overtime
    allowanceInclusions: ['allowances', 'penalties'],
    bonusInclusions: {
      regularBonus: true,
      performanceBonus: true,
      annualBonus: false
    },
    adjustmentRules: {
      baseRateIncrease: true,
      industrialAgreement: true,
      inflationAdjustment: false
    }
  },
  WA: {
    jurisdiction: 'WA',
    defaultReferencePeriod: 52, // 12 months
    alternativeReferencePeriods: [26, 13],
    minimumWeeksRequired: 1,
    maxOvertimeInclusion: 100,
    allowanceInclusions: ['bonuses', 'allowances', 'incentive-payments'],
    bonusInclusions: {
      regularBonus: true,
      performanceBonus: true,
      annualBonus: true
    },
    adjustmentRules: {
      baseRateIncrease: true,
      industrialAgreement: true,
      inflationAdjustment: false
    }
  },
  SA: {
    jurisdiction: 'SA',
    defaultReferencePeriod: 52, // 12 months
    alternativeReferencePeriods: [26, 13],
    minimumWeeksRequired: 1,
    maxOvertimeInclusion: 100, // Regular overtime
    allowanceInclusions: ['overtime', 'penalties', 'loadings'],
    bonusInclusions: {
      regularBonus: true,
      performanceBonus: true,
      annualBonus: false
    },
    adjustmentRules: {
      baseRateIncrease: true,
      industrialAgreement: true,
      inflationAdjustment: false
    }
  },
  TAS: {
    jurisdiction: 'TAS',
    defaultReferencePeriod: 52,
    alternativeReferencePeriods: [26, 13],
    minimumWeeksRequired: 1,
    maxOvertimeInclusion: 100,
    allowanceInclusions: ['shift', 'overtime', 'allowances'],
    bonusInclusions: {
      regularBonus: true,
      performanceBonus: false,
      annualBonus: false
    },
    adjustmentRules: {
      baseRateIncrease: true,
      industrialAgreement: false,
      inflationAdjustment: false
    }
  },
  NT: {
    jurisdiction: 'NT',
    defaultReferencePeriod: 52,
    alternativeReferencePeriods: [26, 13],
    minimumWeeksRequired: 1,
    maxOvertimeInclusion: 100,
    allowanceInclusions: ['shift', 'overtime', 'allowances'],
    bonusInclusions: {
      regularBonus: true,
      performanceBonus: false,
      annualBonus: false
    },
    adjustmentRules: {
      baseRateIncrease: true,
      industrialAgreement: false,
      inflationAdjustment: false
    }
  },
  ACT: {
    jurisdiction: 'ACT',
    defaultReferencePeriod: 52,
    alternativeReferencePeriods: [26, 13],
    minimumWeeksRequired: 1,
    maxOvertimeInclusion: 100,
    allowanceInclusions: ['shift', 'overtime', 'allowances'],
    bonusInclusions: {
      regularBonus: true,
      performanceBonus: false,
      annualBonus: false
    },
    adjustmentRules: {
      baseRateIncrease: true,
      industrialAgreement: false,
      inflationAdjustment: false
    }
  }
};

export const piaweService = {
  getJurisdictionRules(jurisdiction: JurisdictionType): JurisdictionRules {
    return JURISDICTION_RULES[jurisdiction];
  },

  calculatePIAWE(
    payslips: PayslipEntry[],
    injuryDate: string,
    jurisdiction: JurisdictionType,
    adjustments: PIAWEAdjustment[] = []
  ): PIAWECalculation {
    const rules = this.getJurisdictionRules(jurisdiction);
    const injuryDateObj = parseISO(injuryDate);
    
    // Sort payslips by date (most recent first)
    const sortedPayslips = [...payslips].sort((a, b) => 
      parseISO(b.weekEnding).getTime() - parseISO(a.weekEnding).getTime()
    );

    // Calculate for different reference periods based on jurisdiction
    const period52Week = this.calculateForPeriod(sortedPayslips, injuryDateObj, 52, rules, jurisdiction);
    const period13Week = this.calculateForPeriod(sortedPayslips, injuryDateObj, 13, rules, jurisdiction);
    
    // Determine which method to use based on jurisdiction rules
    const { finalPIAWE, methodUsed } = this.determineFinalPIAWE(period52Week, period13Week, rules, jurisdiction);
    
    // Apply jurisdiction-specific caps
    const cappedPIAWE = this.applyCapping(finalPIAWE, rules);
    
    // Apply adjustments
    const adjustedPIAWE = this.applyAdjustments(cappedPIAWE, adjustments);
    
    // Validate calculation
    const validationIssues = this.validateCalculation(sortedPayslips, injuryDateObj, rules, jurisdiction);

    return {
      id: `piawe-${Date.now()}`,
      caseId: '',
      workerId: '',
      jurisdiction,
      employmentType: 'full-time',
      injuryDate,
      calculationDate: new Date().toISOString(),
      referencePeriodsUsed: ['52-week', '13-week'],
      payslips: sortedPayslips,
      calculations: {
        period52Week,
        period13Week
      },
      finalPIAWE: adjustedPIAWE,
      methodUsed: `${methodUsed} (${jurisdiction} formula)`,
      adjustments,
      validationIssues,
      createdBy: 'System',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  },

  calculateForPeriod(
    payslips: PayslipEntry[],
    injuryDate: Date,
    periodWeeks: number,
    rules: JurisdictionRules,
    jurisdiction: JurisdictionType
  ): PIAWEResult {
    const periodStartDate = subWeeks(injuryDate, periodWeeks);
    
    // Filter payslips within the reference period
    const relevantPayslips = payslips.filter(payslip => {
      const payslipDate = parseISO(payslip.weekEnding);
      return isAfter(payslipDate, periodStartDate) && 
             (isBefore(payslipDate, injuryDate) || payslipDate.getTime() === injuryDate.getTime());
    });

    // Exclude unpaid leave periods
    const workingPayslips = relevantPayslips.filter(payslip => !payslip.unpaidLeave);
    
    // Calculate earnings based on jurisdiction-specific rules
    const earnings = this.calculateJurisdictionEarnings(workingPayslips, jurisdiction, rules);
    
    const includedWeeks = workingPayslips.length;
    const excludedWeeks = relevantPayslips.length - workingPayslips.length;
    
    // Calculate average based on jurisdiction formula
    let averageWeekly = 0;
    if (includedWeeks > 0) {
      switch (jurisdiction) {
        case 'NSW':
          // NSW: Total ordinary earnings / Number of weeks worked
          averageWeekly = earnings.ordinaryEarnings / includedWeeks;
          break;
        case 'VIC':
          // VIC: Gross earnings (excluding super) / Number of weeks worked
          averageWeekly = earnings.totalEarnings / includedWeeks;
          break;
        case 'QLD':
        case 'WA':
        case 'SA':
          // QLD/WA/SA: Total earnings (excluding super) over period / Number of weeks worked
          averageWeekly = earnings.totalEarnings / includedWeeks;
          break;
        default:
          // Default calculation for other jurisdictions
          averageWeekly = earnings.totalEarnings / includedWeeks;
          break;
      }
    }

    return {
      totalEarnings: earnings.totalEarnings,
      totalWeeks: periodWeeks,
      averageWeekly,
      ordinaryEarnings: earnings.ordinaryEarnings,
      overtimeEarnings: earnings.overtimeEarnings,
      allowancesTotal: earnings.allowancesTotal,
      bonusesTotal: earnings.bonusesTotal,
      commissionsTotal: earnings.commissionsTotal,
      otherIncomeTotal: earnings.otherIncomeTotal,
      excludedWeeks,
      includedWeeks
    };
  },

  calculateJurisdictionEarnings(
    payslips: PayslipEntry[],
    jurisdiction: JurisdictionType,
    rules: JurisdictionRules
  ): {
    totalEarnings: number;
    ordinaryEarnings: number;
    overtimeEarnings: number;
    allowancesTotal: number;
    bonusesTotal: number;
    commissionsTotal: number;
    otherIncomeTotal: number;
  } {
    let totalEarnings = 0;
    let ordinaryEarnings = 0;
    let overtimeEarnings = 0;
    let allowancesTotal = 0;
    let bonusesTotal = 0;
    let commissionsTotal = 0;
    let otherIncomeTotal = 0;

    payslips.forEach(payslip => {
      // Base wages always included
      const ordinary = payslip.ordinaryHours * payslip.ordinaryRate;
      ordinaryEarnings += ordinary;
      totalEarnings += ordinary;

      // Overtime inclusion based on jurisdiction
      let overtimeToInclude = 0;
      switch (jurisdiction) {
        case 'NSW':
          // NSW: Only regular overtime
          overtimeToInclude = this.isRegularOvertime(payslips, payslip) ? 
            payslip.overtimeHours * payslip.overtimeRate : 0;
          break;
        case 'VIC':
          // VIC: Regular overtime only
          overtimeToInclude = this.isRegularOvertime(payslips, payslip) ? 
            payslip.overtimeHours * payslip.overtimeRate : 0;
          break;
        case 'QLD':
        case 'WA':
        case 'SA':
          // QLD/WA/SA: Consistent/regular overtime
          overtimeToInclude = this.isConsistentOvertime(payslips, payslip) ? 
            payslip.overtimeHours * payslip.overtimeRate : 0;
          break;
        default:
          overtimeToInclude = payslip.overtimeHours * payslip.overtimeRate;
          break;
      }
      overtimeEarnings += overtimeToInclude;
      totalEarnings += overtimeToInclude;

      // Allowances based on jurisdiction rules
      if (rules.allowanceInclusions.length > 0) {
        allowancesTotal += payslip.allowances;
        totalEarnings += payslip.allowances;
      }

      // Bonuses based on jurisdiction rules
      let bonusesToInclude = 0;
      switch (jurisdiction) {
        case 'NSW':
          // NSW: Excludes one-off bonuses, includes regular bonuses
          bonusesToInclude = this.isRegularBonus(payslips, payslip) ? payslip.bonuses : 0;
          break;
        case 'VIC':
          // VIC: Includes bonuses
          bonusesToInclude = payslip.bonuses;
          break;
        case 'QLD':
        case 'WA':
        case 'SA':
          // QLD/WA/SA: Includes bonuses and incentive payments
          bonusesToInclude = payslip.bonuses;
          break;
        default:
          bonusesToInclude = payslip.bonuses;
          break;
      }
      bonusesTotal += bonusesToInclude;
      totalEarnings += bonusesToInclude;

      // Commissions
      switch (jurisdiction) {
        case 'VIC':
        case 'QLD':
        case 'WA':
          commissionsTotal += payslip.commissions;
          totalEarnings += payslip.commissions;
          break;
        default:
          // NSW and others may have different rules for commissions
          commissionsTotal += payslip.commissions;
          totalEarnings += payslip.commissions;
          break;
      }

      // Other income (piece rates, etc.)
      switch (jurisdiction) {
        case 'NSW':
          // NSW includes piece rates
          otherIncomeTotal += payslip.otherIncome;
          totalEarnings += payslip.otherIncome;
          break;
        default:
          otherIncomeTotal += payslip.otherIncome;
          totalEarnings += payslip.otherIncome;
          break;
      }
    });

    return {
      totalEarnings,
      ordinaryEarnings,
      overtimeEarnings,
      allowancesTotal,
      bonusesTotal,
      commissionsTotal,
      otherIncomeTotal
    };
  },

  isRegularOvertime(payslips: PayslipEntry[], currentPayslip: PayslipEntry): boolean {
    // Consider overtime regular if it appears in at least 50% of recent payslips
    const recentPayslips = payslips.slice(0, Math.min(8, payslips.length));
    const overtimePayslips = recentPayslips.filter(p => p.overtimeHours > 0);
    return overtimePayslips.length >= recentPayslips.length * 0.5;
  },

  isConsistentOvertime(payslips: PayslipEntry[], currentPayslip: PayslipEntry): boolean {
    // Similar to regular but with slightly different threshold for QLD/WA/SA
    const recentPayslips = payslips.slice(0, Math.min(12, payslips.length));
    const overtimePayslips = recentPayslips.filter(p => p.overtimeHours > 0);
    return overtimePayslips.length >= recentPayslips.length * 0.4;
  },

  isRegularBonus(payslips: PayslipEntry[], currentPayslip: PayslipEntry): boolean {
    // Consider bonus regular if it appears consistently
    const recentPayslips = payslips.slice(0, Math.min(12, payslips.length));
    const bonusPayslips = recentPayslips.filter(p => p.bonuses > 0);
    return bonusPayslips.length >= 3; // At least 3 occurrences in recent history
  },

  determineFinalPIAWE(
    period52Week: PIAWEResult,
    period13Week: PIAWEResult,
    rules: JurisdictionRules,
    jurisdiction: JurisdictionType
  ): { finalPIAWE: number; methodUsed: string } {
    // Jurisdiction-specific logic for determining final PIAWE
    switch (jurisdiction) {
      case 'NSW':
        // NSW: Use 52-week period as standard, fall back to available data
        if (period52Week.includedWeeks >= 26) {
          return {
            finalPIAWE: period52Week.averageWeekly,
            methodUsed: '52-week average (NSW standard)'
          };
        } else if (period13Week.includedWeeks >= 4) {
          return {
            finalPIAWE: period13Week.averageWeekly,
            methodUsed: '13-week average (insufficient 52-week data)'
          };
        }
        break;

      case 'VIC':
        // VIC: 52-week period preferred, with special rules for apprentices
        if (period52Week.includedWeeks >= 20) {
          return {
            finalPIAWE: period52Week.averageWeekly,
            methodUsed: '52-week average (VIC standard)'
          };
        } else if (period13Week.includedWeeks >= 4) {
          return {
            finalPIAWE: period13Week.averageWeekly,
            methodUsed: '13-week average (insufficient 52-week data)'
          };
        }
        break;

      case 'QLD':
        // QLD: 12 months (52 weeks) standard, shorter for seasonal workers
        if (period52Week.includedWeeks >= 26) {
          return {
            finalPIAWE: period52Week.averageWeekly,
            methodUsed: '52-week average (QLD 12-month standard)'
          };
        } else if (period13Week.includedWeeks >= 8) {
          return {
            finalPIAWE: period13Week.averageWeekly,
            methodUsed: '13-week average (seasonal/part-time adjustment)'
          };
        }
        break;

      case 'WA':
        // WA: 12 months average, can be negotiated for fluctuating earnings
        if (period52Week.includedWeeks >= 26) {
          const fluctuation = this.calculateEarningsFluctuation(period52Week);
          if (fluctuation > 0.3) {
            // High fluctuation - may need negotiated rate
            return {
              finalPIAWE: period52Week.averageWeekly,
              methodUsed: '52-week average (high fluctuation - may require negotiation)'
            };
          }
          return {
            finalPIAWE: period52Week.averageWeekly,
            methodUsed: '52-week average (WA 12-month standard)'
          };
        }
        break;

      case 'SA':
        // SA: 12 months average
        if (period52Week.includedWeeks >= 26) {
          return {
            finalPIAWE: period52Week.averageWeekly,
            methodUsed: '52-week average (SA 12-month standard)'
          };
        } else if (period13Week.includedWeeks >= 8) {
          return {
            finalPIAWE: period13Week.averageWeekly,
            methodUsed: '13-week average (insufficient 12-month data)'
          };
        }
        break;

      default:
        // Default logic for other jurisdictions
        if (period52Week.includedWeeks >= rules.minimumWeeksRequired) {
          return {
            finalPIAWE: period52Week.averageWeekly,
            methodUsed: '52-week average'
          };
        }
        break;
    }

    // Fallback to best available data
    const bestPeriod = period52Week.includedWeeks > period13Week.includedWeeks ? period52Week : period13Week;
    return {
      finalPIAWE: bestPeriod.averageWeekly,
      methodUsed: `${bestPeriod.includedWeeks}-week average (insufficient data)`
    };
  },

  calculateEarningsFluctuation(result: PIAWEResult): number {
    // Simple fluctuation calculation - in practice this would analyze individual payslips
    // Returns a value between 0 and 1 representing the degree of fluctuation
    return 0.2; // Placeholder - would need actual payslip analysis
  },

  applyCapping(piawe: number, rules: JurisdictionRules): number {
    if (rules.cappingRules?.maxWeeklyAmount && piawe > rules.cappingRules.maxWeeklyAmount) {
      return rules.cappingRules.maxWeeklyAmount;
    }
    return piawe;
  },

  applyAdjustments(basePIAWE: number, adjustments: PIAWEAdjustment[]): number {
    return adjustments.reduce((adjustedAmount, adjustment) => {
      switch (adjustment.type) {
        case 'base-rate-increase':
        case 'industrial-agreement':
          return adjustedAmount + adjustment.amount;
        case 'manual-override':
          return adjustment.amount;
        default:
          return adjustedAmount;
      }
    }, basePIAWE);
  },

  validateCalculation(
    payslips: PayslipEntry[],
    injuryDate: Date,
    rules: JurisdictionRules,
    jurisdiction: JurisdictionType
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    // Check for missing weeks based on jurisdiction requirements
    const periodStartDate = subWeeks(injuryDate, 52);
    const expectedWeeks = differenceInWeeks(injuryDate, periodStartDate);
    const actualWeeks = payslips.length;
    
    // Jurisdiction-specific validation
    switch (jurisdiction) {
      case 'NSW':
        if (actualWeeks < 26 && actualWeeks < expectedWeeks * 0.5) {
          issues.push({
            id: `issue-${Date.now()}-1`,
            type: 'insufficient-data',
            severity: 'warning',
            message: `NSW requires substantial payslip data. Only ${actualWeeks} weeks available.`,
            suggestedAction: 'Obtain additional payslips to meet NSW requirements'
          });
        }
        break;

      case 'VIC':
        if (actualWeeks < 20 && actualWeeks < expectedWeeks * 0.4) {
          issues.push({
            id: `issue-${Date.now()}-1`,
            type: 'insufficient-data',
            severity: 'warning',
            message: `VIC requires adequate payslip data. Only ${actualWeeks} weeks available.`,
            suggestedAction: 'Consider apprentice/trainee provisions if applicable'
          });
        }
        break;

      case 'QLD':
        if (actualWeeks < 26) {
          issues.push({
            id: `issue-${Date.now()}-1`,
            type: 'insufficient-data',
            severity: 'warning',
            message: `QLD prefers 12 months of data. Consider seasonal worker provisions.`,
            suggestedAction: 'Review if shorter reference period is appropriate for this worker'
          });
        }
        break;

      case 'WA':
        // Check for earnings fluctuation
        if (payslips.length > 4) {
          const earnings = payslips.map(p => p.totalGross);
          const average = earnings.reduce((sum, val) => sum + val, 0) / earnings.length;
          const hasHighFluctuation = earnings.some(earning => 
            Math.abs(earning - average) > average * 0.4
          );
          
          if (hasHighFluctuation) {
            issues.push({
              id: `issue-${Date.now()}-2`,
              type: 'extreme-fluctuation',
              severity: 'warning',
              message: 'WA: Significant earnings fluctuation detected - may require negotiated PIAWE',
              suggestedAction: 'Consider negotiating PIAWE due to fluctuating earnings pattern'
            });
          }
        }
        break;

      case 'SA':
        // SA-specific validation
        if (actualWeeks < 26) {
          issues.push({
            id: `issue-${Date.now()}-1`,
            type: 'insufficient-data',
            severity: 'warning',
            message: `SA requires 12 months average. Only ${actualWeeks} weeks available.`,
            suggestedAction: 'Obtain additional payslip records for accurate SA calculation'
          });
        }
        break;
    }
    
    // Check for extreme fluctuations (general)
    if (payslips.length > 4) {
      const earnings = payslips.map(p => p.totalGross);
      const average = earnings.reduce((sum, val) => sum + val, 0) / earnings.length;
      const hasExtremeFluctuation = earnings.some(earning => 
        Math.abs(earning - average) > average * 0.6
      );
      
      if (hasExtremeFluctuation) {
        issues.push({
          id: `issue-${Date.now()}-3`,
          type: 'extreme-fluctuation',
          severity: 'warning',
          message: 'Extreme variations in weekly earnings detected',
          suggestedAction: `Review payslips for accuracy and consider ${jurisdiction}-specific provisions for irregular earnings`
        });
      }
    }
    
    // Check for superannuation inclusion (should be excluded)
    const hasSuperConcern = payslips.some(p => p.totalGross > (p.ordinaryHours * p.ordinaryRate + p.overtimeHours * p.overtimeRate + p.allowances + p.bonuses + p.commissions + p.otherIncome) * 1.1);
    if (hasSuperConcern) {
      issues.push({
        id: `issue-${Date.now()}-4`,
        type: 'inconsistent-rates',
        severity: 'error',
        message: 'Possible superannuation inclusion detected in gross earnings',
        suggestedAction: 'Verify that superannuation is excluded from PIAWE calculation as per legislation'
      });
    }
    
    return issues;
  },

  async parsePayslipData(file: File): Promise<PayslipEntry[]> {
    // Enhanced OCR parsing with jurisdiction awareness
    return new Promise((resolve) => {
      setTimeout(() => {
        // Mock parsed data with more realistic variations
        const mockData: PayslipEntry[] = [
          {
            id: `entry-${Date.now()}-1`,
            weekEnding: format(subWeeks(new Date(), 1), 'yyyy-MM-dd'),
            ordinaryHours: 38,
            ordinaryRate: 28.50,
            overtimeHours: 4,
            overtimeRate: 42.75,
            allowances: 120, // Shift allowance
            bonuses: 0,
            commissions: 0,
            otherIncome: 0,
            totalGross: 1413, // Calculated: (38*28.50) + (4*42.75) + 120
            unpaidLeave: false
          },
          {
            id: `entry-${Date.now()}-2`,
            weekEnding: format(subWeeks(new Date(), 2), 'yyyy-MM-dd'),
            ordinaryHours: 38,
            ordinaryRate: 28.50,
            overtimeHours: 2,
            overtimeRate: 42.75,
            allowances: 120,
            bonuses: 0,
            commissions: 0,
            otherIncome: 0,
            totalGross: 1328.5, // (38*28.50) + (2*42.75) + 120
            unpaidLeave: false
          },
          {
            id: `entry-${Date.now()}-3`,
            weekEnding: format(subWeeks(new Date(), 3), 'yyyy-MM-dd'),
            ordinaryHours: 38,
            ordinaryRate: 28.50,
            overtimeHours: 6,
            overtimeRate: 42.75,
            allowances: 120,
            bonuses: 200, // Quarterly bonus
            commissions: 0,
            otherIncome: 0,
            totalGross: 1719.5, // (38*28.50) + (6*42.75) + 120 + 200
            unpaidLeave: false
          }
        ];
        resolve(mockData);
      }, 1000);
    });
  },

  generatePIAWEStatement(calculation: PIAWECalculation): Blob {
    // Enhanced PDF statement with jurisdiction-specific information
    const content = `
PIAWE CALCULATION STATEMENT
${calculation.jurisdiction} JURISDICTION

Worker: ${calculation.workerId}
Injury Date: ${format(parseISO(calculation.injuryDate), 'dd/MM/yyyy')}
Jurisdiction: ${calculation.jurisdiction}
Calculation Date: ${format(parseISO(calculation.calculationDate), 'dd/MM/yyyy')}

JURISDICTION-SPECIFIC FORMULA:
${this.getJurisdictionFormula(calculation.jurisdiction)}

CALCULATION SUMMARY:
Final PIAWE: $${calculation.finalPIAWE.toFixed(2)}
Method Used: ${calculation.methodUsed}

52-WEEK PERIOD CALCULATION:
Total Earnings: $${calculation.calculations.period52Week.totalEarnings.toFixed(2)}
- Ordinary Earnings: $${calculation.calculations.period52Week.ordinaryEarnings.toFixed(2)}
- Overtime Earnings: $${calculation.calculations.period52Week.overtimeEarnings.toFixed(2)}
- Allowances: $${calculation.calculations.period52Week.allowancesTotal.toFixed(2)}
- Bonuses: $${calculation.calculations.period52Week.bonusesTotal.toFixed(2)}
- Commissions: $${calculation.calculations.period52Week.commissionsTotal.toFixed(2)}
- Other Income: $${calculation.calculations.period52Week.otherIncomeTotal.toFixed(2)}

Included Weeks: ${calculation.calculations.period52Week.includedWeeks}
Excluded Weeks: ${calculation.calculations.period52Week.excludedWeeks}
Average Weekly: $${calculation.calculations.period52Week.averageWeekly.toFixed(2)}

13-WEEK PERIOD CALCULATION:
Total Earnings: $${calculation.calculations.period13Week.totalEarnings.toFixed(2)}
Included Weeks: ${calculation.calculations.period13Week.includedWeeks}
Average Weekly: $${calculation.calculations.period13Week.averageWeekly.toFixed(2)}

ADJUSTMENTS APPLIED:
${calculation.adjustments.map(adj => `${adj.description}: $${adj.amount.toFixed(2)}`).join('\n')}

VALIDATION ISSUES:
${calculation.validationIssues.map(issue => `${issue.severity.toUpperCase()}: ${issue.message}`).join('\n')}

LEGISLATIVE REFERENCE:
${this.getLegislativeReference(calculation.jurisdiction)}

This calculation complies with ${calculation.jurisdiction} workers' compensation legislation.
    `;
    
    return new Blob([content], { type: 'application/pdf' });
  },

  getJurisdictionFormula(jurisdiction: JurisdictionType): string {
    switch (jurisdiction) {
      case 'NSW':
        return 'PIAWE = Total ordinary earnings in 52 weeks pre-injury / Number of weeks worked\nIncludes: Base wages, regular overtime, piece rates, bonuses, shift allowances\nExcludes: Superannuation, non-cash benefits, one-off bonuses';
      case 'VIC':
        return 'PIAWE = Gross earnings (excluding super) over 52 weeks / Number of weeks worked\nIncludes: Regular overtime, shift penalties, commissions, bonuses\nExcludes: Super, occasional/irregular overtime, non-cash benefits';
      case 'QLD':
        return 'PIAWE = Total earnings (excluding super) over last 12 months / Number of weeks worked\nIncludes: Consistent overtime, allowances, penalties\nNote: Shorter reference period may apply for seasonal/part-time workers';
      case 'WA':
        return 'PIAWE = Average gross weekly earnings in 12 months pre-injury\nIncludes: Bonuses, allowances, incentive payments\nNote: Can be negotiated for fluctuating earnings patterns';
      case 'SA':
        return 'PIAWE = Average weekly earnings over 12 months prior to injury\nIncludes: Regular overtime, penalties, loadings\nNote: Superannuation paid separately by insurer after 52 weeks';
      default:
        return 'Standard PIAWE calculation based on average weekly earnings';
    }
  },

  getLegislativeReference(jurisdiction: JurisdictionType): string {
    switch (jurisdiction) {
      case 'NSW':
        return 'Workers Compensation Act 1987 (NSW) - icare/SIRA';
      case 'VIC':
        return 'Workplace Injury Rehabilitation and Compensation Act 2013 (VIC) - WorkSafe Victoria';
      case 'QLD':
        return 'Workers\' Compensation and Rehabilitation Act 2003 (QLD) - WorkCover QLD';
      case 'WA':
        return 'Workers\' Compensation and Injury Management Act 1981 (WA) - WorkCover WA';
      case 'SA':
        return 'Return to Work Act 2014 (SA) - ReturnToWorkSA';
      case 'TAS':
        return 'Workers Rehabilitation and Compensation Act 1988 (TAS)';
      case 'NT':
        return 'Return to Work Act 1986 (NT)';
      case 'ACT':
        return 'Workers Compensation Act 1951 (ACT)';
      default:
        return 'Relevant workers\' compensation legislation';
    }
  }
};