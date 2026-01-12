FROM mcr.microsoft.com/dotnet/sdk:10.0 as build

# Install grate as a global tool
RUN dotnet tool install -g grate

FROM mcr.microsoft.com/dotnet/runtime:10.0 as runtime

# Copy grate from build stage
RUN mkdir -p /root/.dotnet/tools
COPY --from=build /root/.dotnet/tools /root/.dotnet/tools

# Add dotnet tools to PATH
ENV PATH="${PATH}:/root/.dotnet/tools"

# Set working directory
WORKDIR /db

# Copy db directory contents
COPY . /db/

# Run grate with connection string from environment variable (non-interactive)
ENTRYPOINT ["/bin/sh", "-c", "grate --connectionstring \"$SQL_CONNECTION\" --databasetype sqlserver --files /db --noninteractive"]
