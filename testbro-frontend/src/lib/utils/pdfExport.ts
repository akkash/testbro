import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { ClientReportData, CostSavingsMetrics, IndustryBenchmark } from '../services/dashboardService'

export class PDFExportService {
  /**
   * Generate a client-ready PDF report
   */
  static async generateClientReport(data: ClientReportData): Promise<void> {
    const doc = new jsPDF('p', 'mm', 'a4')
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20
    let yPosition = margin

    // Helper function to add new page if needed
    const checkPageBreak = (additionalHeight: number) => {
      if (yPosition + additionalHeight > pageHeight - margin) {
        doc.addPage()
        yPosition = margin
        return true
      }
      return false
    }

    // Helper function to add text with word wrapping
    const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize = 10) => {
      doc.setFontSize(fontSize)
      const lines = doc.splitTextToSize(text, maxWidth)
      doc.text(lines, x, y)
      return lines.length * (fontSize * 0.4) // Approximate line height
    }

    // Title Page
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text('Test Automation Analytics Report', pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 15

    doc.setFontSize(16)
    doc.setFont('helvetica', 'normal')
    doc.text(`${data.companyName}`, pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 10

    doc.setFontSize(12)
    doc.text(`Report Period: ${data.reportPeriod}`, pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 8
    doc.text(`Generated: ${new Date(data.reportDate).toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 30

    // Executive Summary
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('Executive Summary', margin, yPosition)
    yPosition += 15

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    
    const summaryItems = [
      `Total Tests Executed: ${data.executiveSummary.totalTests.toLocaleString()}`,
      `System Reliability: ${data.executiveSummary.reliability.toFixed(1)}%`,
      `Monthly Cost Savings: $${data.executiveSummary.costSavings.toLocaleString()}`,
      `Issues Prevented: ${data.executiveSummary.issuesPrevented}`
    ]

    summaryItems.forEach(item => {
      doc.text(`• ${item}`, margin + 5, yPosition)
      yPosition += 6
    })

    yPosition += 10

    // Key Metrics Section
    checkPageBreak(40)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Key Performance Metrics', margin, yPosition)
    yPosition += 12

    const metrics = [
      { label: 'Test Reliability', value: `${data.keyMetrics.reliabilityScore.toFixed(1)}%` },
      { label: 'Pass Rate', value: `${data.keyMetrics.passRate.toFixed(1)}%` },
      { label: 'Average Execution Time', value: `${(data.keyMetrics.avgExecutionTime / 60).toFixed(1)} min` },
      { label: 'Total Tests', value: data.keyMetrics.totalTests.toString() }
    ]

    metrics.forEach(metric => {
      doc.setFont('helvetica', 'normal')
      doc.text(metric.label, margin + 5, yPosition)
      doc.setFont('helvetica', 'bold')
      doc.text(metric.value, pageWidth - margin - 40, yPosition, { align: 'right' })
      yPosition += 8
    })

    yPosition += 15

    // Cost Savings Section
    checkPageBreak(60)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Automation Cost Savings', margin, yPosition)
    yPosition += 12

    const costMetrics = [
      { label: 'Hours Saved This Month', value: `${data.costSavings.hoursSaved} hours` },
      { label: 'Monthly Savings', value: `$${data.costSavings.monthlySavings.toLocaleString()}` },
      { label: 'Projected Annual Savings', value: `$${data.costSavings.yearlyProjectedSavings.toLocaleString()}` },
      { label: 'Manual Testing Hours Avoided', value: `${data.costSavings.manualTestingHoursAvoided} hours` },
      { label: 'Bug Fix Time Reduced', value: `${data.costSavings.bugFixTimeReduced} hours` },
      { label: 'Regression Tests Automated', value: `${data.costSavings.regressionTestsSaved}` }
    ]

    costMetrics.forEach(metric => {
      doc.setFont('helvetica', 'normal')
      doc.text(metric.label, margin + 5, yPosition)
      doc.setFont('helvetica', 'bold')
      doc.text(metric.value, pageWidth - margin - 60, yPosition, { align: 'right' })
      yPosition += 8
    })

    // Highlight box for main savings
    const savingsText = `Your automation saved ~${data.costSavings.hoursSaved} hours manual testing this month`
    doc.setFillColor(240, 248, 255) // Light blue background
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 15, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(savingsText, pageWidth / 2, yPosition + 10, { align: 'center' })
    yPosition += 25

    // Industry Benchmarks Section
    checkPageBreak(80)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Industry Benchmarks', margin, yPosition)
    yPosition += 12

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    const benchmarkText = 'Performance compared to industry standards helps demonstrate your competitive advantage:'
    yPosition += addWrappedText(benchmarkText, margin, yPosition, pageWidth - 2 * margin, 10)
    yPosition += 5

    data.benchmarks.forEach(benchmark => {
      checkPageBreak(20)
      
      doc.setFont('helvetica', 'bold')
      doc.text(benchmark.metric, margin + 5, yPosition)
      yPosition += 6
      
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text(`Your Performance: ${benchmark.yourValue}${benchmark.unit}`, margin + 10, yPosition)
      yPosition += 4
      doc.text(`Industry Average: ${benchmark.industryAverage}${benchmark.unit}`, margin + 10, yPosition)
      yPosition += 4
      doc.text(`Top 10% Companies: ${benchmark.industryTop10}${benchmark.unit}`, margin + 10, yPosition)
      yPosition += 4
      
      // Performance indicator
      const performance = benchmark.yourValue > benchmark.industryAverage ? 
        `✓ Above average (${benchmark.percentile}th percentile)` : 
        `→ Below average (${benchmark.percentile}th percentile)`
      
      doc.setFont('helvetica', 'bold')
      if (benchmark.yourValue > benchmark.industryAverage) {
        doc.setTextColor(0, 150, 0) // Green
      } else {
        doc.setTextColor(255, 100, 0) // Orange
      }
      doc.text(performance, margin + 10, yPosition)
      doc.setTextColor(0, 0, 0) // Reset to black
      yPosition += 8
    })

    yPosition += 10

    // Recommendations Section
    checkPageBreak(60)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Recommendations', margin, yPosition)
    yPosition += 12

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    data.recommendations.forEach((rec, index) => {
      checkPageBreak(8)
      doc.text(`${index + 1}. ${rec}`, margin + 5, yPosition)
      yPosition += 6
    })

    yPosition += 15

    // Next Steps Section
    checkPageBreak(40)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Next Steps', margin, yPosition)
    yPosition += 12

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    data.nextSteps.forEach((step, index) => {
      checkPageBreak(8)
      doc.text(`${index + 1}. ${step}`, margin + 5, yPosition)
      yPosition += 6
    })

    // Footer on each page
    const totalPages = doc.internal.pages.length - 1 // Subtract 1 because pages array includes a blank first element
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text(`TestBro Analytics Report - Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' })
    }

    // Save the PDF
    const fileName = `TestBro_Analytics_Report_${data.companyName.replace(/\s+/g, '_')}_${data.reportDate}.pdf`
    doc.save(fileName)
  }

  /**
   * Export current analytics dashboard as PDF
   */
  static async exportDashboardToPDF(elementId: string, filename = 'analytics-dashboard'): Promise<void> {
    const element = document.getElementById(elementId)
    if (!element) {
      throw new Error(`Element with ID '${elementId}' not found`)
    }

    try {
      // Configure html2canvas for better quality
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: element.scrollWidth,
        height: element.scrollHeight
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = canvas.width
      const imgHeight = canvas.height
      
      // Calculate dimensions to fit the page
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight)
      const finalWidth = imgWidth * ratio
      const finalHeight = imgHeight * ratio
      
      // Center the image
      const x = (pdfWidth - finalWidth) / 2
      const y = (pdfHeight - finalHeight) / 2
      
      pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight)
      
      const timestamp = new Date().toISOString().split('T')[0]
      pdf.save(`${filename}_${timestamp}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      throw new Error('Failed to generate PDF export')
    }
  }

  /**
   * Generate a simple metrics summary PDF
   */
  static async generateMetricsSummary(
    metrics: any, 
    costSavings: CostSavingsMetrics, 
    benchmarks: IndustryBenchmark[]
  ): Promise<void> {
    const doc = new jsPDF('p', 'mm', 'a4')
    const pageWidth = doc.internal.pageSize.getWidth()
    let yPosition = 30

    // Title
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('TestBro Analytics Summary', pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 20

    // Key savings message
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    const savingsMessage = `Your automation saved ~${costSavings.hoursSaved} hours manual testing this month`
    doc.text(savingsMessage, pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 15

    // Cost savings
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`Monthly Savings: $${costSavings.monthlySavings.toLocaleString()}`, 20, yPosition)
    yPosition += 8
    doc.text(`Annual Projection: $${costSavings.yearlyProjectedSavings.toLocaleString()}`, 20, yPosition)
    yPosition += 15

    // Benchmarks summary
    doc.setFont('helvetica', 'bold')
    doc.text('Industry Comparison:', 20, yPosition)
    yPosition += 10

    benchmarks.slice(0, 3).forEach(benchmark => {
      doc.setFont('helvetica', 'normal')
      const status = benchmark.yourValue > benchmark.industryAverage ? '✓ Above Average' : '→ Below Average'
      doc.text(`${benchmark.metric}: ${status} (${benchmark.percentile}th percentile)`, 25, yPosition)
      yPosition += 6
    })

    const timestamp = new Date().toISOString().split('T')[0]
    doc.save(`TestBro_Summary_${timestamp}.pdf`)
  }
}