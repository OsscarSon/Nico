using System;

static void Require(bool condition, string check)
{
    if (!condition) throw new InvalidOperationException(check);
}

var simulation = new MotionKernel();
Require(simulation.Advance(35) == 1, "35 ms produces one step");
Require(simulation.Advance(15) == 1, "carried remainder produces second step");
Require(simulation.SimulatedMilliseconds == 40, "50 ms includes 10 ms remainder");
Require(Math.Abs(simulation.Position - 0.24) < 1e-12, "6 m/s for 40 ms");

var consolidated = new MotionKernel();
consolidated.Advance(50);
Require(consolidated.Position == simulation.Position, "partition invariance");
Require(simulation.Advance(10) == 1, "consumes remaining 10 ms");
try
{
    simulation.Advance(-1);
    throw new InvalidOperationException("negative interval accepted");
}
catch (ArgumentOutOfRangeException)
{
    Require(simulation.SimulatedMilliseconds == 60, "bad input changed the simulation");
}
Console.WriteLine("C# fixed-step execution passed: interval partition, position and invalid input");
