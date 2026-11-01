INSERT INTO SavingPlan (plan_type, interest, min_balance) VALUES
('Children', 12.00, 0.00),
('Teen', 11.00, 500.00),
('Adult', 10.00, 1000.00),
('Senior', 13.00, 1000.00),
('Joint', 7.00, 5000.00);

SELECT * FROM SavingPlan ORDER BY saving_plan_id;

INSERT INTO FDPlan (fd_options, interest) VALUES
('6 months', 13.00),
('1 year', 14.00),
('3 years', 15.00);