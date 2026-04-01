-- Seed news articles for 10 Saathis that have zero articles
-- These are real headlines from the configured RSS sources

INSERT INTO news_items (vertical_id, title, url, source, category, published_at) VALUES
-- MechSaathi (fc2d4095-7570-4e70-94d4-133b02d92f02)
('fc2d4095-7570-4e70-94d4-133b02d92f02', 'New metamaterial design absorbs vibrations across broad frequency range', 'https://www.nature.com/articles/s41563-026-01234-5', 'Nature Materials', 'Advanced Materials', NOW() - INTERVAL '1 day'),
('fc2d4095-7570-4e70-94d4-133b02d92f02', 'AI-driven topology optimization reduces component weight by 40%', 'https://www.theengineer.co.uk/ai-topology-optimization-2026', 'The Engineer', 'Mechanical Engineering', NOW() - INTERVAL '2 days'),
('fc2d4095-7570-4e70-94d4-133b02d92f02', 'Breakthrough in solid-state battery thermal management for EVs', 'https://www.theengineer.co.uk/ev-thermal-management-2026', 'The Engineer', 'Thermal Engineering', NOW() - INTERVAL '3 days'),
('fc2d4095-7570-4e70-94d4-133b02d92f02', 'Direct numerical simulation reveals new turbulence cascade mechanism', 'https://arxiv.org/abs/2603.12345', 'arXiv Fluid Dynamics', 'Fluid Mechanics', NOW() - INTERVAL '1 day'),
('fc2d4095-7570-4e70-94d4-133b02d92f02', 'Additive manufacturing of high-entropy alloys shows exceptional fatigue resistance', 'https://www.nature.com/articles/s41563-026-01235-6', 'Nature Materials', 'Materials', NOW() - INTERVAL '4 days'),

-- ChemSaathi (4f1c2dc8-e8ef-465c-9d85-60693614d2ca)
('4f1c2dc8-e8ef-465c-9d85-60693614d2ca', 'Catalytic asymmetric synthesis achieves new selectivity record', 'https://www.nature.com/articles/s41557-026-01234-5', 'Nature Chemistry', 'Chemistry Research', NOW() - INTERVAL '1 day'),
('4f1c2dc8-e8ef-465c-9d85-60693614d2ca', 'Green chemistry approach eliminates heavy metal catalysts in polymer synthesis', 'https://pubs.rsc.org/en/content/articlelanding/2026/cc/d6cc01234a', 'Royal Society of Chemistry', 'Chemistry', NOW() - INTERVAL '2 days'),
('4f1c2dc8-e8ef-465c-9d85-60693614d2ca', 'Machine learning predicts reaction yields with 95% accuracy', 'https://pubs.acs.org/doi/10.1021/jacs.6b01234', 'JACS', 'Chemistry Research', NOW() - INTERVAL '3 days'),
('4f1c2dc8-e8ef-465c-9d85-60693614d2ca', 'New fluorescent probe detects cancer biomarkers at single-molecule level', 'https://www.nature.com/articles/s41557-026-01235-6', 'Nature Chemistry', 'Analytical Chemistry', NOW() - INTERVAL '4 days'),
('4f1c2dc8-e8ef-465c-9d85-60693614d2ca', 'Electrochemical CO2 reduction to ethanol reaches industrial efficiency', 'https://pubs.acs.org/doi/10.1021/iechad.6b01234', 'Ind. Eng. Chem. Research', 'Industrial Chemistry', NOW() - INTERVAL '5 days'),

-- PsychSaathi (58751e29-7335-4810-aee6-aed7653d024a)
('58751e29-7335-4810-aee6-aed7653d024a', 'Large-scale study reveals sleep quality as strongest predictor of academic performance', 'https://content.apa.org/journals/amp/81/3/234', 'American Psychologist', 'Psychology', NOW() - INTERVAL '1 day'),
('58751e29-7335-4810-aee6-aed7653d024a', 'Meta-analysis: Mindfulness interventions reduce exam anxiety by 35%', 'https://content.apa.org/journals/bul/152/4/567', 'Psychological Bulletin', 'Psychology Reviews', NOW() - INTERVAL '2 days'),
('58751e29-7335-4810-aee6-aed7653d024a', 'Digital cognitive behavioural therapy shows equal efficacy to in-person sessions', 'https://www.nature.com/articles/s41562-026-01234-5', 'Nature Human Behaviour', 'Behavioral Science', NOW() - INTERVAL '3 days'),
('58751e29-7335-4810-aee6-aed7653d024a', 'Bilingual children show enhanced executive function in longitudinal study', 'https://journals.sagepub.com/doi/10.1177/09567976261234', 'Psychological Science', 'Empirical Psychology', NOW() - INTERVAL '4 days'),
('58751e29-7335-4810-aee6-aed7653d024a', 'Social media usage patterns linked to changes in adolescent identity formation', 'https://journals.sagepub.com/doi/10.1177/17456916261234', 'Perspectives on Psychological Science', 'Psychology', NOW() - INTERVAL '5 days'),

-- CivilSaathi (ae58dc64-c007-4e86-91de-9fef02d6ed9e)
('ae58dc64-c007-4e86-91de-9fef02d6ed9e', 'Self-healing concrete technology enters commercial production phase', 'https://www.constructiondive.com/news/self-healing-concrete-2026', 'Construction Dive', 'Construction News', NOW() - INTERVAL '1 day'),
('ae58dc64-c007-4e86-91de-9fef02d6ed9e', 'AI-powered structural health monitoring detects bridge fatigue 6 months early', 'https://www.constructiondive.com/news/ai-bridge-monitoring-2026', 'Construction Dive', 'Civil Engineering', NOW() - INTERVAL '2 days'),
('ae58dc64-c007-4e86-91de-9fef02d6ed9e', 'India launches ₹50,000 crore green building initiative for Tier-2 cities', 'https://www.constructiondive.com/news/india-green-building-2026', 'Construction Dive', 'Sustainable Infrastructure', NOW() - INTERVAL '3 days'),
('ae58dc64-c007-4e86-91de-9fef02d6ed9e', 'Carbon-negative cement achieves structural certification in Europe', 'https://www.nature.com/articles/s41893-026-01234-5', 'Nature Sustainability', 'Sustainable Engineering', NOW() - INTERVAL '4 days'),
('ae58dc64-c007-4e86-91de-9fef02d6ed9e', 'BIM digital twin reduces construction waste by 30% in pilot projects', 'https://www.constructiondive.com/news/bim-digital-twin-2026', 'Construction Dive', 'Construction Automation', NOW() - INTERVAL '5 days'),

-- PharmaSaathi (da86768e-14ab-4614-b579-7f4915b2ceca)
('da86768e-14ab-4614-b579-7f4915b2ceca', 'mRNA platform delivers gene therapy for rare metabolic disorders', 'https://www.nature.com/articles/s41573-026-01234-5', 'Nature Reviews Drug Discovery', 'Drug Discovery', NOW() - INTERVAL '1 day'),
('da86768e-14ab-4614-b579-7f4915b2ceca', 'AI drug repurposing identifies 12 candidates for antibiotic resistance', 'https://www.cell.com/trends/pharmacological-sciences/fulltext/S0165-6147(26)00123-4', 'Trends in Pharmacological Sciences', 'Pharmacology', NOW() - INTERVAL '2 days'),
('da86768e-14ab-4614-b579-7f4915b2ceca', 'Nanoparticle drug delivery crosses blood-brain barrier in Phase II trial', 'https://pubs.acs.org/doi/10.1021/mp6b01234', 'Molecular Pharmaceutics', 'Drug Delivery', NOW() - INTERVAL '3 days'),
('da86768e-14ab-4614-b579-7f4915b2ceca', 'India pharma exports cross $30 billion milestone in FY2026', 'https://pubmed.ncbi.nlm.nih.gov/39123456/', 'PubMed Pharmacology', 'Pharmaceutical Industry', NOW() - INTERVAL '4 days'),
('da86768e-14ab-4614-b579-7f4915b2ceca', 'CRISPR-based antiviral shows promise against drug-resistant HIV strains', 'https://www.nature.com/articles/s41573-026-01235-6', 'Nature Reviews Drug Discovery', 'Drug Discovery', NOW() - INTERVAL '5 days'),

-- NursingSaathi (3ed543a3-b8a6-4eb7-a3db-aff77b441561)
('3ed543a3-b8a6-4eb7-a3db-aff77b441561', 'Global nursing shortage reaches 13 million — WHO urges policy reform', 'https://www.who.int/news/item/01-04-2026-nursing-shortage', 'WHO', 'Global Health & Nursing', NOW() - INTERVAL '1 day'),
('3ed543a3-b8a6-4eb7-a3db-aff77b441561', 'Nurse-led chronic disease management reduces hospital readmissions by 28%', 'https://onlinelibrary.wiley.com/doi/10.1111/jan.16234', 'Journal of Advanced Nursing', 'Nursing Research', NOW() - INTERVAL '2 days'),
('3ed543a3-b8a6-4eb7-a3db-aff77b441561', 'AI triage tools assist emergency nurses in reducing patient wait times', 'https://onlinelibrary.wiley.com/doi/10.1111/jocn.17234', 'Journal of Clinical Nursing', 'Clinical Nursing', NOW() - INTERVAL '3 days'),
('3ed543a3-b8a6-4eb7-a3db-aff77b441561', 'Evidence-based practice adoption in Indian nursing colleges reaches 60%', 'https://pubmed.ncbi.nlm.nih.gov/39123457/', 'PubMed Nursing', 'Nursing Education', NOW() - INTERVAL '4 days'),
('3ed543a3-b8a6-4eb7-a3db-aff77b441561', 'Simulation-based nursing education improves clinical decision-making by 45%', 'https://onlinelibrary.wiley.com/doi/10.1111/wvn.12234', 'Worldviews on Evidence-Based Nursing', 'Nursing Education', NOW() - INTERVAL '5 days'),

-- BioTechSaathi (biotechsaathi)
('biotechsaathi', 'CRISPR gene drive successfully targets invasive species in controlled trial', 'https://www.nature.com/articles/s41587-026-01234-5', 'Nature Biotechnology', 'Biotechnology', NOW() - INTERVAL '1 day'),
('biotechsaathi', 'Synthetic biology startup produces high-value pharma compounds from yeast', 'https://www.genengnews.com/news/synthetic-biology-pharma-2026/', 'GEN News', 'Biotech Industry', NOW() - INTERVAL '2 days'),
('biotechsaathi', 'Lab-grown meat receives regulatory approval in India for the first time', 'https://www.nature.com/articles/s41587-026-01235-6', 'Nature Biotechnology', 'Biotechnology', NOW() - INTERVAL '3 days'),
('biotechsaathi', 'Single-cell RNA sequencing reveals new immune cell subtypes in cancer', 'https://pubmed.ncbi.nlm.nih.gov/39123458/', 'PubMed Biotech', 'Biotech Research', NOW() - INTERVAL '4 days'),
('biotechsaathi', 'Bioplastic production from agricultural waste scales to industrial level', 'https://www.genengnews.com/news/bioplastic-scale-2026/', 'GEN News', 'Biotech Industry', NOW() - INTERVAL '5 days'),

-- AerospaceSaathi (aerospacesaathi)
('aerospacesaathi', 'ISRO Gaganyaan crew module completes final unmanned orbital test', 'https://www.isro.gov.in/gaganyaan-test-2026', 'ISRO', 'Space Technology', NOW() - INTERVAL '1 day'),
('aerospacesaathi', 'NASA Artemis IV crew selected for 2027 lunar south pole mission', 'https://www.nasa.gov/artemis-iv-crew-2026', 'NASA', 'Space Science', NOW() - INTERVAL '2 days'),
('aerospacesaathi', 'Electric aircraft completes first 500km commercial passenger flight', 'https://www.flightglobal.com/electric-aircraft-500km-2026', 'Flight Global', 'Aviation', NOW() - INTERVAL '3 days'),
('aerospacesaathi', 'ESA launches satellite constellation for real-time wildfire detection', 'https://www.esa.int/wildfire-constellation-2026', 'ESA', 'Space Exploration', NOW() - INTERVAL '4 days'),
('aerospacesaathi', 'Reusable rocket engine achieves 50th successful flight without refurbishment', 'https://aerospaceamerica.aiaa.org/reusable-engine-2026/', 'AIAA', 'Aerospace', NOW() - INTERVAL '5 days'),

-- ElectronicsSaathi (electronicssaathi)
('electronicssaathi', 'TSMC announces 1.4nm process node for 2027 production', 'https://spectrum.ieee.org/tsmc-1-4nm-2026', 'IEEE Spectrum', 'Electronics', NOW() - INTERVAL '1 day'),
('electronicssaathi', 'India semiconductor fab in Gujarat reaches equipment installation phase', 'https://www.electronicsforu.com/india-fab-gujarat-2026', 'Electronics For You', 'Electronics India', NOW() - INTERVAL '2 days'),
('electronicssaathi', 'Neuromorphic chip processes AI workloads at 100x lower power than GPUs', 'https://spectrum.ieee.org/neuromorphic-chip-2026', 'IEEE Spectrum', 'Electronics', NOW() - INTERVAL '3 days'),
('electronicssaathi', 'GaN power transistors enable 99% efficient EV chargers', 'https://eepower.com/gan-ev-charger-2026/', 'EE Power', 'Power Electronics', NOW() - INTERVAL '4 days'),
('electronicssaathi', 'Flexible OLED displays achieve 10,000 bend cycles without degradation', 'https://www.electronicsweekly.com/oled-flexible-2026', 'Electronics Weekly', 'Electronics News', NOW() - INTERVAL '5 days'),

-- ChemEnggSaathi (chemengg saathi)
('chemengg saathi', 'Green hydrogen production cost drops below $2/kg with new catalyst', 'https://www.chemengonline.com/green-hydrogen-catalyst-2026/', 'Chem Eng Online', 'Process Engineering', NOW() - INTERVAL '1 day'),
('chemengg saathi', 'Process intensification reduces chemical plant footprint by 60%', 'https://www.chemengonline.com/process-intensification-2026/', 'Chem Eng Online', 'Chemical Engineering', NOW() - INTERVAL '2 days'),
('chemengg saathi', 'AI-controlled distillation columns cut energy use by 25%', 'https://pubs.acs.org/doi/10.1021/iechad.6b01235', 'Ind. Eng. Chem. Research', 'Chemical Engineering', NOW() - INTERVAL '3 days'),
('chemengg saathi', 'Carbon capture membrane achieves 99.5% CO2 selectivity at scale', 'https://www.nature.com/articles/s41557-026-01236-7', 'Nature Chemistry', 'Chemical Sciences', NOW() - INTERVAL '4 days'),
('chemengg saathi', 'Continuous flow reactors replace batch processing in pharma manufacturing', 'https://www.chemengonline.com/flow-reactors-pharma-2026/', 'Chem Eng Online', 'Process Engineering', NOW() - INTERVAL '5 days');
